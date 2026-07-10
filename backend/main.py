import os
import json
import secrets
from concurrent.futures import ThreadPoolExecutor, as_completed
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


class GenerateEvalsRequest(BaseModel):
    purpose: str
    repo_id: str


class RunEvalsRequest(BaseModel):
    repo_id: str
    version_id: str


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


def get_prompt_version_by_id(supabase: Any, version_id: str) -> dict[str, Any]:
    result = (
        supabase.table("prompt_versions")
        .select("id, repo_id, content, model, temperature, max_tokens")
        .eq("id", version_id)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Prompt version not found.")

    return result.data[0]


def get_eval_cases(supabase: Any, repo_id: str) -> list[dict[str, Any]]:
    result = (
        supabase.table("eval_cases")
        .select("id, repo_id, input, expected_outcome, description, created_at")
        .eq("repo_id", repo_id)
        .order("created_at", desc=False)
        .execute()
    )

    return result.data or []


def extract_json_payload(raw_text: str) -> Any:
    text = raw_text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:].strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Could not parse Groq JSON response: {exc}") from exc


def extract_pass_fail(raw_text: str) -> bool:
    verdict = raw_text.strip().upper()
    if verdict.startswith("PASS"):
        return True
    if verdict.startswith("FAIL"):
        return False
    raise HTTPException(status_code=502, detail=f"Unexpected eval verdict: {raw_text}")


def call_groq_completion(
    client: Groq,
    *,
    system: str,
    user: str,
    model: str,
    temperature: float,
    max_tokens: int,
) -> str:
    completion = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return completion.choices[0].message.content or ""


def run_eval_case(version: dict[str, Any], eval_case: dict[str, Any]) -> dict[str, Any]:
    try:
        client = get_groq_client()
        response_text = call_groq_completion(
            client,
            system=version["content"],
            user=f'{eval_case["input"]}\n\nRespond in one sentence.',
            model=version["model"],
            temperature=version["temperature"],
            max_tokens=version["max_tokens"],
        )
        verdict_text = call_groq_completion(
            client,
            system="You are grading a prompt response. Reply with only PASS or FAIL.",
            user=(
                f'Expected: {eval_case["expected_outcome"]}\n'
                f'Actual response: {response_text}'
            ),
            model=version["model"],
            temperature=0,
            max_tokens=8,
        )
        passed_case = extract_pass_fail(verdict_text)
    except Exception:
        response_text = ""
        passed_case = False

    return {
        "eval_case_id": eval_case["id"],
        "input": eval_case["input"],
        "expected_outcome": eval_case["expected_outcome"],
        "description": eval_case.get("description"),
        "response": response_text,
        "passed": passed_case,
        "verdict": "PASS" if passed_case else "FAIL",
    }


@app.post("/api/playground")
def run_playground(payload: PlaygroundRequest) -> dict[str, str]:
    try:
        client = get_groq_client()
        response = call_groq_completion(
            client,
            system=payload.prompt,
            user=payload.test_message,
            model=payload.model,
            temperature=payload.temperature,
            max_tokens=payload.max_tokens,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

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
        response = call_groq_completion(
            client,
            system=prompt_version["content"],
            user=payload.message,
            model=prompt_version["model"],
            temperature=prompt_version["temperature"],
            max_tokens=prompt_version["max_tokens"],
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"response": response}


@app.post("/api/generate-evals")
def generate_evals(payload: GenerateEvalsRequest) -> dict[str, Any]:
    supabase = get_supabase()

    try:
        client = get_groq_client()
        raw_response = call_groq_completion(
            client,
            system=(
                "You generate evaluation cases for prompt testing. "
                "Return only valid JSON: an array of 10 objects with keys input, expected_outcome, description. "
                "Do not wrap the output in markdown."
            ),
            user=f"Prompt purpose: {payload.purpose.strip()}",
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            max_tokens=1200,
        )
        generated_cases = extract_json_payload(raw_response)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if not isinstance(generated_cases, list):
        raise HTTPException(status_code=502, detail="Groq did not return an eval array.")

    inserts = []
    for case in generated_cases[:10]:
        if not isinstance(case, dict):
            continue
        inserts.append(
            {
                "repo_id": payload.repo_id,
                "input": str(case.get("input", "")).strip(),
                "expected_outcome": str(case.get("expected_outcome", "")).strip(),
                "description": str(case.get("description", "")).strip() or None,
            }
        )

    if not inserts:
        raise HTTPException(status_code=502, detail="No valid eval cases were generated.")

    result = supabase.table("eval_cases").insert(inserts).execute()
    return {"inserted": len(result.data or inserts), "cases": result.data or inserts}


@app.post("/api/run-evals")
def run_evals(payload: RunEvalsRequest) -> dict[str, Any]:
    supabase = get_supabase()
    version = get_prompt_version_by_id(supabase, payload.version_id)
    eval_cases = get_eval_cases(supabase, payload.repo_id)

    if not eval_cases:
        raise HTTPException(status_code=404, detail="No eval cases found for this repo.")

    results: list[dict[str, Any]] = []
    passed = 0
    max_workers = min(4, len(eval_cases))

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_index = {
            executor.submit(run_eval_case, version, eval_case): index
            for index, eval_case in enumerate(eval_cases)
        }

        results_by_index: dict[int, dict[str, Any]] = {}

        for future in as_completed(future_to_index):
            index = future_to_index[future]
            result = future.result()
            results_by_index[index] = result

    for index in range(len(eval_cases)):
        result = results_by_index[index]
        if result["passed"]:
            passed += 1

        results.append(result)

    total = len(results)
    run_insert = supabase.table("eval_runs").insert(
        {
            "repo_id": payload.repo_id,
            "version_id": payload.version_id,
            "score": passed,
            "total": total,
            "results": results,
        }
    ).execute()

    (
        supabase.table("prompt_versions")
        .update({"eval_score": passed, "eval_total": total})
        .eq("id", payload.version_id)
        .execute()
    )

    return {
        "score": passed,
        "total": total,
        "results": results,
        "run_id": run_insert.data[0]["id"] if run_insert.data else None,
    }
