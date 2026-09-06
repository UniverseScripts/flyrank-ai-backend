import json
import time
from pathlib import Path
from fastapi.testclient import TestClient
from src.main import app

CASES_PATH = Path(__file__).resolve().parent / "cases.json"

def run_evaluation():
    client = TestClient(app)
    
    with open(CASES_PATH, "r", encoding="utf-8") as f:
        cases = json.load(f)

    print("=" * 60)
    print(f"Running LLM Classifier Eval Suite ({len(cases)} test cases)")
    print("=" * 60)

    category_matches = 0
    urgency_matches = 0
    results = []

    for case in cases:
        case_id = case["id"]
        user_text = case["input"]
        expected_cat = case["expected"]["category"]
        expected_urg = case["expected"]["urgency"]

        print(f"\n[Case {case_id}] Testing: \"{user_text}\"")
        start = time.time()
        res = client.post("/v1/classify-support-message", json={"text": user_text})
        duration = time.time() - start

        if res.status_code != 200:
            print(f"  ❌ Error: HTTP {res.status_code} - {res.text}")
            results.append({
                "id": case_id,
                "passed": False,
                "error": res.text,
            })
            continue

        body = res.json()
        pred_cat = body.get("category")
        pred_urg = body.get("urgency")
        confidence = body.get("confidence")
        reason = body.get("reason")

        cat_ok = (pred_cat == expected_cat)
        urg_ok = (pred_urg == expected_urg)

        if cat_ok:
            category_matches += 1
        if urg_ok:
            urgency_matches += 1

        passed = cat_ok

        status_str = "[PASS]" if passed else "[FAIL]"
        print(f"  {status_str} | Expected: category={expected_cat}, urgency={expected_urg}")
        print(f"         | Predicted: category={pred_cat}, urgency={pred_urg}, conf={confidence:.2f} ({duration:.2f}s)")
        print(f"         | Reason: {reason}")

        results.append({
            "id": case_id,
            "passed": passed,
            "expected_category": expected_cat,
            "predicted_category": pred_cat,
            "expected_urgency": expected_urg,
            "predicted_urgency": pred_urg,
            "confidence": confidence,
            "reason": reason,
            "duration_s": round(duration, 2)
        })

    total = len(cases)
    cat_accuracy = (category_matches / total) * 100
    urg_accuracy = (urgency_matches / total) * 100

    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Primary Field (Category) Score: {category_matches}/{total} ({cat_accuracy:.1f}%)")
    print(f"Secondary Field (Urgency) Score: {urgency_matches}/{total} ({urg_accuracy:.1f}%)")
    print(f"Total Cases: {total}")
    print("=" * 60)

    return {
        "total": total,
        "category_matches": category_matches,
        "category_accuracy": cat_accuracy,
        "urgency_matches": urgency_matches,
        "urgency_accuracy": urg_accuracy,
        "results": results
    }

if __name__ == "__main__":
    run_evaluation()
