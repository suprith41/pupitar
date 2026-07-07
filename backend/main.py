import os
import secrets
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field

load_dotenv()
load_dotenv(Path(__file__).with_name(".env"))

app = FastAPI(title="Pupitar API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


class PlaygroundRequest(BaseModel):
    prompt: str
    model: str
    temperature: float = Field(ge=0, le=1)
    max_tokens: int = Field(gt=0)
    test_message: str


class DeployRequest(BaseModel):
    repo_id: str


class RunRequest(BaseModel):
    message: str


def get_supabase() -> Any:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
        )

    try:
        from supabase import create_client
    except ModuleNotFoundError as exc:
        raise HTTPException(status_code=500, detail="Supabase backend dependency is not installed.") from exc

    return create_client(url, key)


def get_groq_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured.")

    return Groq(api_key=api_key)


def get_latest_prompt_version(supabase: Any, repo_id: str) -> dict[str, Any]:
    result = (
        supabase.table("prompt_versions")
        .select("id, content, model, temperature, max_tokens")
        .eq("repo_id", repo_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="No prompt versions found for this repo.")

    return result.data[0]


@app.post("/api/playground")
def run_playground(payload: PlaygroundRequest) -> dict[str, str]:
    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model=payload.model,
            messages=[
                {"role": "system", "content": payload.prompt},
                {"role": "user", "content": payload.test_message},
            ],
            temperature=payload.temperature,
            max_tokens=payload.max_tokens,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    response = completion.choices[0].message.content or ""
    return {"response": response}


@app.post("/api/deploy")
def deploy_repo(payload: DeployRequest) -> dict[str, str]:
    supabase = get_supabase()
    latest_version = get_latest_prompt_version(supabase, payload.repo_id)

    existing = (
        supabase.table("deployments")
        .select("id, api_key")
        .eq("repo_id", payload.repo_id)
        .limit(1)
        .execute()
    )

    if existing.data:
        api_key = existing.data[0]["api_key"]
        (
            supabase.table("deployments")
            .update({"active_version_id": latest_version["id"]})
            .eq("id", existing.data[0]["id"])
            .execute()
        )
    else:
        api_key = secrets.token_hex(24)
        (
            supabase.table("deployments")
            .insert(
                {
                    "repo_id": payload.repo_id,
                    "active_version_id": latest_version["id"],
                    "api_key": api_key,
                }
            )
            .execute()
        )

    return {"endpoint_url": f"/api/run/{payload.repo_id}", "api_key": api_key}


@app.post("/api/run/{repo_id}")
def run_deployed_repo(
    repo_id: str,
    payload: RunRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")

    supplied_api_key = authorization.removeprefix("Bearer ").strip()
    supabase = get_supabase()

    deployment_result = (
        supabase.table("deployments")
        .select("active_version_id, api_key")
        .eq("repo_id", repo_id)
        .limit(1)
        .execute()
    )

    if not deployment_result.data or deployment_result.data[0]["api_key"] != supplied_api_key:
        raise HTTPException(status_code=401, detail="Invalid api_key.")

    version_result = (
        supabase.table("prompt_versions")
        .select("content, model, temperature, max_tokens")
        .eq("id", deployment_result.data[0]["active_version_id"])
        .single()
        .execute()
    )

    if not version_result.data:
        raise HTTPException(status_code=404, detail="Active prompt version not found.")

    prompt_version = version_result.data

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model=prompt_version["model"],
            messages=[
                {"role": "system", "content": prompt_version["content"]},
                {"role": "user", "content": payload.message},
            ],
            temperature=prompt_version["temperature"],
            max_tokens=prompt_version["max_tokens"],
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    response = completion.choices[0].message.content or ""
    return {"response": response}
