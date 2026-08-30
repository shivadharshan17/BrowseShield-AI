import os
import json
import re
import time
from typing import Optional, Literal, List, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from google import genai


# =========================================================
# LIMITS
# =========================================================

MAX_VISIBLE_TEXT = 3000
MAX_ELEMENTS = 30
MAX_ELEMENT_TEXT = 220
MAX_HISTORY = 1
MAX_MEMORY = 3


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv(override=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

GEMINI_MODEL = (
    os.getenv("GEMINI_MODEL", "")
    .strip()
    .strip('"')
    .strip("'")
)

if GEMINI_MODEL.startswith("models/"):
    GEMINI_MODEL = GEMINI_MODEL[len("models/"):]

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY missing in backend/.env"
    )

if not GEMINI_MODEL:
    raise RuntimeError(
        "GEMINI_MODEL missing in backend/.env"
    )


# =========================================================
# GEMINI CLIENT
# =========================================================

client = genai.Client(
    api_key=GEMINI_API_KEY
)


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="BrowseShield AI Backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# =========================================================
# MODELS
# =========================================================

class AgentRequest(BaseModel):
    command: str
    page: dict
    memory: List[str] = Field(
        default_factory=list
    )
    history: List[Any] = Field(
        default_factory=list
    )


class BrowserAction(BaseModel):
    action: Literal[
        "CLICK",
        "TYPE",
        "SCROLL",
        "NAVIGATE",
        "DONE",
        "NONE"
    ]

    target: Optional[str] = None
    value: Optional[str] = None
    direction: Optional[str] = None
    url: Optional[str] = None

    exactSearch: bool = False
    pressEnter: bool = False

    message: Optional[str] = None

    memory: List[str] = Field(
        default_factory=list
    )


# =========================================================
# PRIVACY FIREWALL
# =========================================================

EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"
)

PHONE_PATTERN = re.compile(
    r"\b(?:\+91[\s-]?)?[6-9]\d{9}\b"
)

PAN_PATTERN = re.compile(
    r"\b[A-Z]{5}[0-9]{4}[A-Z]\b",
    re.IGNORECASE
)

AADHAAR_PATTERN = re.compile(
    r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b"
)


def contains_sensitive(
    value: Any
) -> bool:

    try:
        text = json.dumps(
            value,
            ensure_ascii=False
        )

    except Exception:
        text = str(value)

    return any(
        pattern.search(text)
        for pattern in [
            EMAIL_PATTERN,
            PHONE_PATTERN,
            PAN_PATTERN,
            AADHAAR_PATTERN
        ]
    )


# =========================================================
# REDUCE PAGE BEFORE CLOUD
# =========================================================

def reduce_page(
    page: dict
) -> dict:

    if not isinstance(page, dict):
        raise HTTPException(
            status_code=400,
            detail="Invalid page payload."
        )

    if isinstance(
        page.get("sanitized"),
        dict
    ):
        page = page["sanitized"]

    visible_text = str(
        page.get("visibleText", "")
    )[:MAX_VISIBLE_TEXT]

    result = {
        "url": str(
            page.get("url", "")
        )[:500],

        "title": str(
            page.get("title", "")
        )[:200],

        "visibleText": visible_text,

        "elements": []
    }

    elements = page.get(
        "elements",
        []
    )

    if isinstance(elements, list):

        for element in elements[:MAX_ELEMENTS]:

            if not isinstance(
                element,
                dict
            ):
                continue

            result["elements"].append({
                "id":
                    element.get("id"),

                "tag":
                    element.get("tag"),

                "type":
                    element.get("type"),

                "text":
                    str(
                        element.get(
                            "text",
                            ""
                        )
                    )[:MAX_ELEMENT_TEXT],

                "placeholder":
                    str(
                        element.get(
                            "placeholder",
                            ""
                        )
                    )[:120],

                "ariaLabel":
                    str(
                        element.get(
                            "ariaLabel",
                            ""
                        )
                    )[:120],

                "value":
                    str(
                        element.get(
                            "value",
                            ""
                        )
                    )[:150],

                "href":
                    str(
                        element.get(
                            "href",
                            ""
                        )
                    )[:300]
            })

    return result


# =========================================================
# MATCHING TASK DETECTION
# =========================================================

def is_matching_task(
    command: str
) -> bool:

    text = str(
        command or ""
    ).lower()

    keywords = [
        "best match",
        "strongest match",
        "most suitable",
        "best scheme",
        "matching scheme",
        "suitable scheme",
        "find the best",
        "find strongest",
        "recommend",
        "compare",
        "select"
    ]

    return any(
        keyword in text
        for keyword in keywords
    )


# =========================================================
# VALID ELEMENT IDS
# =========================================================

def get_element_ids(
    page: dict
) -> set[str]:

    result: set[str] = set()

    elements = page.get(
        "elements",
        []
    )

    if not isinstance(
        elements,
        list
    ):
        return result

    for element in elements:

        if not isinstance(
            element,
            dict
        ):
            continue

        element_id = element.get(
            "id"
        )

        if (
            isinstance(
                element_id,
                str
            )
            and element_id
        ):
            result.add(
                element_id
            )

    return result


# =========================================================
# FIND SEARCH TARGET
# =========================================================

def find_search_target(
    page: dict
) -> Optional[str]:

    elements = page.get(
        "elements",
        []
    )

    if not isinstance(
        elements,
        list
    ):
        return None

    # -----------------------------------------------------
    # PASS 1:
    # Explicit search / filter / find input
    # -----------------------------------------------------

    for element in elements:

        if not isinstance(
            element,
            dict
        ):
            continue

        tag = str(
            element.get(
                "tag",
                ""
            )
        ).lower()

        if tag not in [
            "input",
            "textarea"
        ]:
            continue

        element_type = str(
            element.get(
                "type",
                ""
            )
        ).lower()

        metadata = " ".join([
            element_type,

            str(
                element.get(
                    "placeholder",
                    ""
                )
            ).lower(),

            str(
                element.get(
                    "ariaLabel",
                    ""
                )
            ).lower(),

            str(
                element.get(
                    "text",
                    ""
                )
            ).lower()
        ])

        if (
            element_type == "search"
            or "search" in metadata
            or "find" in metadata
            or "filter" in metadata
        ):

            target = element.get(
                "id"
            )

            if target:
                return str(
                    target
                )

    # -----------------------------------------------------
    # PASS 2:
    # One normal text input fallback
    # -----------------------------------------------------

    text_inputs: List[str] = []

    for element in elements:

        if not isinstance(
            element,
            dict
        ):
            continue

        tag = str(
            element.get(
                "tag",
                ""
            )
        ).lower()

        element_type = str(
            element.get(
                "type",
                ""
            )
        ).lower()

        if (
            tag == "input"
            and element_type
            in [
                "",
                "text"
            ]
        ):

            target = element.get(
                "id"
            )

            if target:
                text_inputs.append(
                    str(target)
                )

    if len(
        text_inputs
    ) == 1:

        return text_inputs[0]

    return None


# =========================================================
# PROMPT
# =========================================================

def build_prompt(
    request: AgentRequest,
    page: dict
) -> str:

    page_json = json.dumps(
        page,
        ensure_ascii=False,
        separators=(",", ":")
    )

    memory_json = json.dumps(
        request.memory[
            -MAX_MEMORY:
        ],
        ensure_ascii=False,
        separators=(",", ":")
    )

    history_json = json.dumps(
        request.history[
            -MAX_HISTORY:
        ],
        ensure_ascii=False,
        separators=(",", ":")
    )

    return f"""
You are BrowseShield AI.

Use only sanitized information from SAFE CONTEXT and CURRENT PAGE.

Values beginning with [PRIVATE_ are protected and unavailable.

Never infer, reveal, reconstruct, guess, or type protected values.

USER TASK:
{request.command}

SAFE CONTEXT:
{memory_json}

CURRENT PAGE:
{page_json}

RECENT HISTORY:
{history_json}

Return exactly ONE structured browser action.

GENERAL RULES:

- Never invent webpage information.
- Never invent element IDs.
- CLICK and TYPE must use a real element ID from CURRENT PAGE.
- TYPE only safe non-private information.
- Do not edit private profile information.
- Do not sign in unless explicitly requested.


BEST-MATCH RULES:

If the task asks to find, compare, recommend, select,
or search for the best / strongest / most suitable result:

1. Treat SAFE CONTEXT as the primary user-context evidence.

2. Identify ALL candidate results available in CURRENT PAGE.

3. Evaluate EVERY available candidate before selecting.

4. Compare every candidate against SAFE non-private context.

5. Choose exactly ONE candidate with the strongest direct evidence.

6. Do NOT favor the first or top result.

7. Ignore:
   - ranking
   - relevance sort
   - popularity
   - position
   - result count
   - result order

8. General usefulness alone is not enough.

9. Prefer specific overlap in:
   - title
   - description
   - purpose
   - provider
   - category
   - tags
   - beneficiary
   - occupation
   - profession
   - education
   - employment or business context
   - eligibility
   - benefits
   - requirements

10. Ignore all [PRIVATE_*] values.


MATCHING ACTION:

For matching tasks:

- Do NOT scroll to search for more candidates.
- Use only candidates available in CURRENT PAGE.

If a usable search field exists,
the task is NOT complete until the selected result is searched.

Return:

action = TYPE

target =
real search input element ID

value =
exact selected candidate title WITHOUT quote characters

exactSearch = true

pressEnter = true

message =
Selected: <exact selected title>

Reason: <short evidence-based reason>


IMPORTANT:

- Do NOT return NONE when a usable search field exists.
- Do NOT return DONE when a usable search field exists.
- Do NOT return SCROLL for a matching task.
- Do NOT put quote characters inside value.
- content.js adds quotes locally when exactSearch=true.
- Do not expose internal reasoning.
- Do not include Action:, Target:, element IDs, or ranking position.
"""


# =========================================================
# GEMINI
# =========================================================

def ask_gemini(
    request: AgentRequest,
    page: dict
) -> BrowserAction:

    prompt = build_prompt(
        request,
        page
    )

    print()
    print(
        "=================================="
    )

    print(
        "BrowseShield AI -> Gemini"
    )

    print(
        "Prompt chars:",
        len(prompt)
    )

    print(
        "Page chars:",
        len(
            page.get(
                "visibleText",
                ""
            )
        )
    )

    print(
        "Elements:",
        len(
            page.get(
                "elements",
                []
            )
        )
    )

    print(
        "Safe memory items:",
        len(
            request.memory
        )
    )

    started = (
        time.perf_counter()
    )

    for attempt in range(2):

        try:

            response = (
                client.models.generate_content(

                    model=
                        GEMINI_MODEL,

                    contents=
                        prompt,

                    config={
                        "response_mime_type":
                            "application/json",

                        "response_schema":
                            BrowserAction
                    }
                )
            )

            parsed = getattr(
                response,
                "parsed",
                None
            )

            if parsed is None:

                text = (
                    response.text
                    or ""
                ).strip()

                if not text:

                    raise ValueError(
                        "Gemini returned no decision."
                    )

                parsed = json.loads(
                    text
                )

            if isinstance(
                parsed,
                BrowserAction
            ):

                decision = parsed

            else:

                decision = (
                    BrowserAction.model_validate(
                        parsed
                    )
                )

            elapsed = (
                time.perf_counter()
                - started
            )

            print(
                f"Gemini time: {elapsed:.2f}s"
            )

            print(
                "Raw Gemini Decision:",
                decision.model_dump()
            )

            return decision

        except Exception as error:

            error_text = str(
                error
            )

            temporary = (
                "503" in error_text
                or "UNAVAILABLE"
                in error_text
                or "high demand"
                in error_text.lower()
            )

            if (
                temporary
                and attempt == 0
            ):

                print(
                    "Gemini busy. Quick retry..."
                )

                time.sleep(
                    0.5
                )

                continue

            raise HTTPException(
                status_code=500,
                detail=(
                    "Gemini API error: "
                    + error_text
                )
            )

    raise HTTPException(
        status_code=500,
        detail=
            "Gemini request failed."
    )


# =========================================================
# EXTRACT SELECTED RESULT
# =========================================================

def extract_selected_name(
    message: Optional[str]
) -> Optional[str]:

    if not message:
        return None

    match = re.search(
        r"Selected:\s*(.+?)(?:\r?\n|Reason:|$)",
        message,
        re.IGNORECASE
    )

    if not match:
        return None

    selected = (
        match.group(1)
        .strip()
    )

    return selected or None


# =========================================================
# NORMALIZE MATCHING ACTION
# =========================================================

def normalize_matching_action(
    request: AgentRequest,
    page: dict,
    decision: BrowserAction
) -> BrowserAction:

    if not is_matching_task(
        request.command
    ):
        return decision

    search_target = (
        find_search_target(
            page
        )
    )

    print(
        "Detected search target:",
        search_target
    )

    # -----------------------------------------------------
    # Gemini already returned TYPE
    # -----------------------------------------------------

    if (
        decision.action ==
        "TYPE"
    ):

        if search_target:

            decision.target = (
                search_target
            )

        decision.exactSearch = (
            True
        )

        decision.pressEnter = (
            True
        )

        return decision

    # -----------------------------------------------------
    # Gemini selected a result but returned NONE / DONE
    # -----------------------------------------------------

    if (
        decision.action in [
            "NONE",
            "DONE"
        ]
        and search_target
    ):

        selected = (
            extract_selected_name(
                decision.message
            )
        )

        if selected:

            decision.action = (
                "TYPE"
            )

            decision.target = (
                search_target
            )

            decision.value = (
                selected
            )

            decision.exactSearch = (
                True
            )

            decision.pressEnter = (
                True
            )

            print(
                "BrowseShield forced TYPE action:",
                decision.model_dump()
            )

    return decision


# =========================================================
# CLEAN MESSAGE
# =========================================================

def clean_message(
    message: Optional[str]
) -> Optional[str]:

    if not message:
        return message

    cleaned = str(
        message
    ).strip()

    cleaned = re.sub(
        r"\s+Reason:\s*",
        "\n\nReason: ",
        cleaned,
        flags=re.IGNORECASE
    )

    return cleaned or None


# =========================================================
# VALIDATE ACTION
# =========================================================

def validate_action(
    action: BrowserAction,
    page: dict
) -> BrowserAction:

    valid_ids = (
        get_element_ids(
            page
        )
    )

    # -----------------------------------------------------
    # TYPE
    # -----------------------------------------------------

    if action.action == "TYPE":

        if not action.target:

            raise HTTPException(
                status_code=500,
                detail=
                    "TYPE requires target."
            )

        if (
            action.target
            not in valid_ids
        ):

            raise HTTPException(
                status_code=500,
                detail=
                    "TYPE target is not present in PAGE."
            )

        if action.value is None:

            raise HTTPException(
                status_code=500,
                detail=
                    "TYPE requires value."
            )

        if (
            "[PRIVATE_"
            in action.value
        ):

            raise HTTPException(
                status_code=400,
                detail=
                    "Protected value cannot be typed."
            )

        if contains_sensitive(
            action.value
        ):

            raise HTTPException(
                status_code=400,
                detail=
                    "Sensitive AI output blocked."
            )

    # -----------------------------------------------------
    # CLICK
    # -----------------------------------------------------

    if action.action == "CLICK":

        if not action.target:

            raise HTTPException(
                status_code=500,
                detail=
                    "CLICK requires target."
            )

        if (
            action.target
            not in valid_ids
        ):

            raise HTTPException(
                status_code=500,
                detail=
                    "CLICK target is not present in PAGE."
            )

    # -----------------------------------------------------
    # SCROLL
    # -----------------------------------------------------

    if action.action == "SCROLL":

        direction = str(
            action.direction
            or "DOWN"
        ).upper()

        if direction not in [
            "UP",
            "DOWN"
        ]:

            direction = "DOWN"

        action.direction = (
            direction
        )

    # -----------------------------------------------------
    # NAVIGATE
    # -----------------------------------------------------

    if action.action == "NAVIGATE":

        if not action.url:

            raise HTTPException(
                status_code=500,
                detail=
                    "NAVIGATE requires URL."
            )

        if not (
            action.url.startswith(
                "http://"
            )
            or action.url.startswith(
                "https://"
            )
        ):

            raise HTTPException(
                status_code=400,
                detail=
                    "Unsafe navigation URL."
            )

    return action


# =========================================================
# ROUTES
# =========================================================

@app.get("/")
def root():

    return {
        "status":
            "ok",

        "service":
            "BrowseShield AI",

        "model":
            GEMINI_MODEL
    }


@app.get("/health")
def health():

    return {
        "status":
            "ok"
    }


@app.get("/gemini-test")
def gemini_test():

    started = (
        time.perf_counter()
    )

    try:

        response = (
            client.models.generate_content(

                model=
                    GEMINI_MODEL,

                contents=
                    "Reply exactly with WORKING"
            )
        )

        return {
            "status":
                "ok",

            "response":
                (
                    response.text
                    or ""
                ).strip(),

            "seconds":
                round(
                    time.perf_counter()
                    - started,
                    2
                )
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# =========================================================
# AGENT
# =========================================================

@app.post(
    "/agent",
    response_model=
        BrowserAction
)
def agent(
    request: AgentRequest
):

    page = reduce_page(
        request.page
    )

    print()

    print(
        "Cloud-safe text chars:",
        len(
            page[
                "visibleText"
            ]
        )
    )

    print(
        "Cloud-safe elements:",
        len(
            page[
                "elements"
            ]
        )
    )

    print(
        "Safe memory items:",
        len(
            request.memory
        )
    )

    if request.memory:

        print(
            "Safe context sample:"
        )

        for item in (
            request.memory[
                -MAX_MEMORY:
            ]
        ):

            print(
                str(item)[:1000]
            )

    # -----------------------------------------------------
    # PRIVACY FIREWALL
    # -----------------------------------------------------

    if contains_sensitive(
        page
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Privacy firewall blocked raw "
                "sensitive webpage information."
            )
        )

    if contains_sensitive(
        request.command
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Sensitive information detected "
                "in task command."
            )
        )

    if contains_sensitive(
        request.memory
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Privacy firewall blocked raw "
                "sensitive memory."
            )
        )

    # -----------------------------------------------------
    # GEMINI
    # -----------------------------------------------------

    decision = ask_gemini(
        request,
        page
    )

    # -----------------------------------------------------
    # MATCHING ACTION
    # -----------------------------------------------------

    decision = (
        normalize_matching_action(
            request,
            page,
            decision
        )
    )

    # -----------------------------------------------------
    # CLEAN RESULT MESSAGE
    # -----------------------------------------------------

    decision.message = (
        clean_message(
            decision.message
        )
    )

    # -----------------------------------------------------
    # VALIDATE
    # -----------------------------------------------------

    decision = validate_action(
        decision,
        page
    )

    print(
        "Final Decision:",
        decision.model_dump()
    )

    return decision


# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )