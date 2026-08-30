(() => {

  if (window.__agentcoreLoaded) {
    return;
  }

  window.__agentcoreLoaded = true;

  console.log(
    "BrowseShield AI privacy agent loaded."
  );


  /* =====================================================
     CONFIG
  ===================================================== */

  const AGENTCORE_ATTRIBUTE =
    "data-agentcore-id";

  const MAX_PAGE_TEXT =
    3000;

  const MAX_ELEMENTS =
    20;

  const MAX_ELEMENT_TEXT =
    150;


  /* =====================================================
     HELPERS
  ===================================================== */

  function cleanText(
    value,
    maxLength = MAX_PAGE_TEXT
  ) {

    return String(
      value || ""
    )
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(
        0,
        maxLength
      );
  }


  function normalize(value) {

    return String(
      value || ""
    )
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }


  function isVisible(element) {

    if (!element) {
      return false;
    }

    const style =
      getComputedStyle(element);

    const rect =
      element.getBoundingClientRect();

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity) !== 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }


  function delay(ms) {

    return new Promise(
      resolve =>
        setTimeout(
          resolve,
          ms
        )
    );
  }


  function privatePlaceholder(
    subtype
  ) {

    return `[PRIVATE_${subtype}]`;
  }


  /* =====================================================
     STRUCTURED IDENTIFIER REDACTION
  ===================================================== */

  function redactStructuredIdentifiers(
    text
  ) {

    let result =
      String(
        text || ""
      );

    result =
      result.replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
        "[PRIVATE_EMAIL]"
      );

    result =
      result.replace(
        /\b(?:\+91[\s-]?)?[6-9]\d{9}\b/g,
        "[PRIVATE_PHONE]"
      );

    result =
      result.replace(
        /\b[A-Z]{5}[0-9]{4}[A-Z]\b/gi,
        "[PRIVATE_PAN]"
      );

    result =
      result.replace(
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        "[PRIVATE_AADHAAR]"
      );

    return result;
  }


  /* =====================================================
     SENSITIVE LABELS
  ===================================================== */

  const SENSITIVE_LABELS = [

    {
      subtype: "NAME",
      patterns: [
        /^name$/i,
        /^full name$/i
      ]
    },

    {
      subtype: "EMAIL",
      patterns: [
        /^email$/i,
        /^email address$/i
      ]
    },

    {
      subtype: "PHONE",
      patterns: [
        /^phone$/i,
        /^phone number$/i,
        /^mobile$/i,
        /^mobile number$/i
      ]
    },

    {
      subtype: "DOB",
      patterns: [
        /^dob$/i,
        /^date of birth$/i,
        /^birth date$/i
      ]
    },

    {
      subtype: "AGE",
      patterns: [
        /^age$/i
      ]
    },

    {
      subtype: "GENDER",
      patterns: [
        /^gender$/i,
        /^sex$/i
      ]
    },

    {
      subtype: "STATE",
      patterns: [
        /^state$/i,
        /^beneficiary state$/i,
        /^residential state$/i,
        /^home state$/i
      ]
    },

    {
      subtype: "DISTRICT",
      patterns: [
        /^district$/i,
        /^beneficiary district$/i,
        /^residential district$/i
      ]
    },

    {
      subtype:
        "RESIDENTIAL_AREA",

      patterns: [
        /^residential area$/i,
        /^area type$/i,
        /^location type$/i
      ]
    },

    {
      subtype: "ADDRESS",

      patterns: [
        /^address$/i,
        /^residential address$/i,
        /^permanent address$/i,
        /^home address$/i
      ]
    },

    {
      subtype:
        "SOCIAL_CATEGORY",

      patterns: [
        /^category$/i,
        /^social category$/i,
        /^caste$/i
      ]
    },

    {
      subtype:
        "INCOME",

      patterns: [
        /^income$/i,
        /^annual income$/i,
        /^monthly income$/i,
        /^family annual income$/i,
        /^salary$/i
      ]
    },

    {
      subtype:
        "DISABILITY",

      patterns: [
        /^disability$/i,
        /^disability status$/i
      ]
    },

    {
      subtype:
        "MINORITY_STATUS",

      patterns: [
        /^minority$/i,
        /^minority status$/i
      ]
    },

    {
      subtype:
        "STUDENT_STATUS",

      patterns: [
        /^student$/i,
        /^student status$/i
      ]
    },

    {
      subtype:
        "BPL_STATUS",

      patterns: [
        /^bpl$/i,
        /^bpl status$/i,
        /^below poverty line$/i
      ]
    },

    {
      subtype:
        "AADHAAR",

      patterns: [
        /^aadhaar$/i,
        /^aadhaar number$/i,
        /^aadhar$/i,
        /^aadhar number$/i
      ]
    },

    {
      subtype:
        "PAN",

      patterns: [
        /^pan$/i,
        /^pan number$/i
      ]
    },

    {
      subtype:
        "BANK_ACCOUNT",

      patterns: [
        /^bank account$/i,
        /^bank account number$/i,
        /^account number$/i
      ]
    },

    {
      subtype:
        "PASSWORD",

      patterns: [
        /^password$/i,
        /^passcode$/i,
        /^pin$/i
      ]
    }

  ];


  function matchSensitiveLabel(
    value
  ) {

    const label =
      String(
        value || ""
      )
        .replace(
          /[:\-]\s*$/,
          ""
        )
        .trim();

    return (
      SENSITIVE_LABELS.find(
        rule =>
          rule.patterns.some(
            pattern =>
              pattern.test(
                label
              )
          )
      ) ||
      null
    );
  }


  /* =====================================================
     VISIBLE TEXT SANITIZATION
  ===================================================== */

  function sanitizeVisibleText(
    rawText
  ) {

    const lines =
      String(
        rawText || ""
      )
        .split(/\n/)
        .map(
          line =>
            line.trim()
        );

    const safe = [];

    let protectedCount =
      0;


    for (
      let i = 0;
      i < lines.length;
      i++
    ) {

      const line =
        lines[i];

      if (!line) {

        safe.push("");

        continue;
      }


      /* -----------------------------------------------
         Label: Value
      ----------------------------------------------- */

      const inline =
        line.match(
          /^([^:]{1,100})\s*:\s*(.+)$/
        );

      if (inline) {

        const label =
          inline[1].trim();

        const value =
          inline[2].trim();

        const rule =
          matchSensitiveLabel(
            label
          );

        if (
          rule &&
          value
        ) {

          safe.push(
            `${label}: ${privatePlaceholder(
              rule.subtype
            )}`
          );

          protectedCount++;

          continue;
        }
      }


      /* -----------------------------------------------
         Label on one line
         Value on next line
      ----------------------------------------------- */

      const rule =
        matchSensitiveLabel(
          line
        );

      if (rule) {

        safe.push(
          line
        );

        let next =
          i + 1;

        while (
          next < lines.length &&
          !lines[next]
        ) {

          safe.push("");

          next++;
        }

        if (
          next < lines.length
        ) {

          const candidate =
            lines[next].trim();

          if (
            candidate &&
            !matchSensitiveLabel(
              candidate
            )
          ) {

            safe.push(
              privatePlaceholder(
                rule.subtype
              )
            );

            protectedCount++;

            i =
              next;

            continue;
          }
        }

        continue;
      }


      /* -----------------------------------------------
         Regex based identifiers
      ----------------------------------------------- */

      const protectedLine =
        redactStructuredIdentifiers(
          line
        );

      if (
        protectedLine !==
        line
      ) {

        protectedCount++;
      }

      safe.push(
        protectedLine
      );
    }


    return {

      text:
        cleanText(
          safe.join("\n"),
          MAX_PAGE_TEXT
        ),

      protectedCount
    };
  }


  /* =====================================================
     INPUT PRIVACY
  ===================================================== */

  function classifyInputPrivacy(
    element
  ) {

    const metadata =
      normalize(
        [
          element.type,
          element.name,
          element.id,
          element.placeholder,
          element.autocomplete,

          element.getAttribute(
            "aria-label"
          )

        ].join(" ")
      );


    const rules = [

      [
        /\bpassword|passcode|pin\b/,
        "PASSWORD"
      ],

      [
        /\bemail\b/,
        "EMAIL"
      ],

      [
        /\bphone|mobile|telephone\b/,
        "PHONE"
      ],

      [
        /\baadhaar|aadhar\b/,
        "AADHAAR"
      ],

      [
        /\bpan\b/,
        "PAN"
      ],

      [
        /\bage\b/,
        "AGE"
      ],

      [
        /\bgender|sex\b/,
        "GENDER"
      ],

      [
        /\bincome|salary\b/,
        "INCOME"
      ],

      [
        /\bbank account|account number|ifsc\b/,
        "BANK_ACCOUNT"
      ],

      [
        /\baddress\b/,
        "ADDRESS"
      ]
    ];


    for (
      const [
        regex,
        subtype
      ] of rules
    ) {

      if (
        regex.test(
          metadata
        )
      ) {

        return {
          sensitive: true,
          subtype
        };
      }
    }


    return {
      sensitive: false,
      subtype: "PUBLIC"
    };
  }


  /* =====================================================
     ELEMENT EXTRACTION
  ===================================================== */

  function extractElements() {
  const selector = [
    "button",
    "input",
    "textarea",
    "select",
    "a[href]",
    "[role='button']",
    "[role='link']",
    "[contenteditable='true']"
  ].join(",");

  const nodes = [
    ...document.querySelectorAll(selector)
  ].filter(isVisible);


  /* =====================================================
     IDENTIFY SEARCH FIELD
  ===================================================== */

  function isSearchField(element) {
    const tag =
      element.tagName.toLowerCase();

    if (
      tag !== "input" &&
      tag !== "textarea"
    ) {
      return false;
    }

    const metadata =
      normalize([
        element.type,
        element.name,
        element.id,
        element.placeholder,
        element.getAttribute("aria-label"),
        element.getAttribute("role"),
        element.getAttribute("autocomplete")
      ].join(" "));

    return (
      element.type === "search" ||
      metadata.includes("search") ||
      metadata.includes("find scheme") ||
      metadata.includes("search scheme")
    );
  }


  /* =====================================================
     SEARCH FIELD FIRST
  ===================================================== */

  const searchNodes =
    nodes.filter(isSearchField);

  const otherNodes =
    nodes.filter(
      element =>
        !isSearchField(element)
    );

  const orderedNodes = [
    ...searchNodes,
    ...otherNodes
  ];


  /* =====================================================
     COLLECT ALREADY USED AGENTCORE IDS

     Important:
     We must never create duplicate e1/e2/e3 IDs.
  ===================================================== */

  const usedIds =
    new Set();


  document
    .querySelectorAll(
      `[${AGENTCORE_ATTRIBUTE}]`
    )
    .forEach(element => {

      const existingId =
        element.getAttribute(
          AGENTCORE_ATTRIBUTE
        );

      if (existingId) {
        usedIds.add(
          existingId
        );
      }
    });


  /* =====================================================
     UNIQUE ID GENERATOR
  ===================================================== */

  let nextIdNumber = 1;


  function createUniqueId() {
    let candidate;

    do {
      candidate =
        `e${nextIdNumber++}`;
    }
    while (
      usedIds.has(candidate)
    );

    usedIds.add(candidate);

    return candidate;
  }


  const results = [];


  /* =====================================================
     EXTRACT
  ===================================================== */

  for (
    const element of orderedNodes
  ) {

    if (
      results.length >=
      MAX_ELEMENTS
    ) {
      break;
    }


    /* -----------------------------------------------------
       GET / CREATE UNIQUE ID
    ----------------------------------------------------- */

    let id =
      element.getAttribute(
        AGENTCORE_ATTRIBUTE
      );


    if (!id) {
      id = createUniqueId();

      element.setAttribute(
        AGENTCORE_ATTRIBUTE,
        id
      );
    }


    const tag =
      element.tagName.toLowerCase();


    const privacy =
      classifyInputPrivacy(
        element
      );


    let value = "";


    if (
      [
        "input",
        "textarea",
        "select"
      ].includes(tag)
    ) {

      const rawValue =
        cleanText(
          element.value,
          150
        );


      value =
        privacy.sensitive &&
        rawValue

          ? privatePlaceholder(
              privacy.subtype
            )

          : redactStructuredIdentifiers(
              rawValue
            );
    }


    const visibleText =
      sanitizeVisibleText(
        cleanText(
          element.innerText ||
          element.textContent ||
          "",
          MAX_ELEMENT_TEXT
        )
      ).text;


    /* -----------------------------------------------------
       DEBUG SEARCH INPUT
    ----------------------------------------------------- */

    if (
      isSearchField(element)
    ) {

      console.log(
        "BrowseShield SEARCH FIELD:",
        {
          id,
          tag,
          type:
            element.type || "",
          placeholder:
            element.placeholder || "",
          ariaLabel:
            element.getAttribute(
              "aria-label"
            ) || ""
        }
      );
    }


    results.push({

      id,

      tag,

      type:
        element.type || "",

      text:
        visibleText,

      placeholder:
        cleanText(
          redactStructuredIdentifiers(
            element.placeholder || ""
          ),
          120
        ),

      ariaLabel:
        cleanText(
          redactStructuredIdentifiers(
            element.getAttribute(
              "aria-label"
            ) || ""
          ),
          120
        ),

      value,

      href:
        tag === "a"
          ? cleanText(
              element.href,
              300
            )
          : "",

      privacy
    });
  }


  console.log(
    "BrowseShield extracted elements:",
    results
  );


  return results;
}


  /* =====================================================
     PAGE EXTRACTION
  ===================================================== */

  function extractPageData() {

    const rawText =
      cleanText(
        document.body?.innerText ||
        "",
        MAX_PAGE_TEXT
      );


    const sanitized =
      sanitizeVisibleText(
        rawText
      );


    const elements =
      extractElements();


    return {

      sanitized: {

        url:
          window.location.href,

        title:
          cleanText(
            redactStructuredIdentifiers(
              document.title
            ),
            200
          ),

        visibleText:
          sanitized.text,

        elements
      },

      privacySummary: {

        protected:
          sanitized.protectedCount >
          0,

        protectedCount:
          sanitized.protectedCount
      }

    };
  }


  /* =====================================================
     CLOSE VISIBLE DIALOG
  ===================================================== */

  function closeVisibleDialog() {

    const controls = [
      ...document.querySelectorAll(
        `
          button,
          [role="button"],
          [aria-label],
          [title]
        `
      )
    ].filter(
      isVisible
    );


    const directClose =
      controls.find(
        element => {

          const text =
            normalize(
              element.innerText ||
              element.textContent
            );

          const aria =
            normalize(
              element.getAttribute(
                "aria-label"
              )
            );

          const title =
            normalize(
              element.getAttribute(
                "title"
              )
            );

          return (
            text === "x" ||
            text === "×" ||
            text === "✕" ||
            text === "✖" ||
            text === "close" ||
            aria === "close" ||
            aria.includes("close") ||
            title.includes("close")
          );
        }
      );


    if (
      directClose
    ) {

      directClose.click();

      return true;
    }


    const dialogs = [
      ...document.querySelectorAll(
        `
          [role="dialog"],
          [aria-modal="true"],
          dialog
        `
      )
    ].filter(
      isVisible
    );


    for (
      const dialog of dialogs
    ) {

      const rect =
        dialog.getBoundingClientRect();


      const candidates = [
        ...dialog.querySelectorAll(
          `
            button,
            [role="button"],
            [tabindex],
            svg
          `
        )
      ].filter(
        isVisible
      );


      let best =
        null;

      let bestDistance =
        Infinity;


      for (
        const candidate of candidates
      ) {

        const r =
          candidate.getBoundingClientRect();

        const x =
          r.left +
          r.width / 2;

        const y =
          r.top +
          r.height / 2;

        const distance =
          Math.hypot(
            rect.right - x,
            y - rect.top
          );


        if (
          distance <
          bestDistance &&
          y <
          rect.top + 120
        ) {

          best =
            candidate;

          bestDistance =
            distance;
        }
      }


      if (best) {

        const clickable =
          best.closest(
            "button,[role='button'],[tabindex]"
          ) ||
          best;

        clickable.click();

        return true;
      }
    }


    return false;
  }


  /* =====================================================
     FIND ELEMENT
  ===================================================== */

  function findElement(target) {
  if (!target) {
    return null;
  }

  try {
    const matches = [
      ...document.querySelectorAll(
        `[${AGENTCORE_ATTRIBUTE}="${CSS.escape(target)}"]`
      )
    ];


    console.log(
      `BrowseShield target ${target} matches:`,
      matches.length
    );


    if (
      matches.length === 0
    ) {
      return null;
    }


    if (
      matches.length > 1
    ) {
      console.warn(
        `Duplicate BrowseShield ID detected: ${target}`,
        matches
      );
    }


    /*
      If duplicates somehow remain,
      prefer an actual text input.
    */

    const textInput =
      matches.find(
        element => {

          const tag =
            element.tagName.toLowerCase();

          return (
            tag === "input" ||
            tag === "textarea" ||
            element.isContentEditable
          );
        }
      );


    if (textInput) {
      return textInput;
    }


    return matches[0];

  } catch (error) {

    console.error(
      "BrowseShield findElement error:",
      error
    );

    return null;
  }
}


  /* =====================================================
     CLICK
  ===================================================== */

  async function executeClick(
    target
  ) {

    const element =
      findElement(
        target
      );


    if (!element) {

      throw new Error(
        `Element ${target} not found.`
      );
    }


    element.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });


    await delay(
      100
    );


    element.click();


    return {
      action: "CLICK",
      target
    };
  }


  /* =====================================================
     NATIVE VALUE
  ===================================================== */

function setNativeValue(element, value) {
  if (!element) {
    throw new Error("Input element not found.");
  }

  if (element.isContentEditable) {
    element.textContent = value;
    return;
  }

  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;

  const prototypeDescriptor =
    Object.getOwnPropertyDescriptor(
      prototype,
      "value"
    );

  const ownDescriptor =
    Object.getOwnPropertyDescriptor(
      element,
      "value"
    );

  if (
    prototypeDescriptor &&
    typeof prototypeDescriptor.set === "function"
  ) {
    prototypeDescriptor.set.call(
      element,
      value
    );
  } else if (
    ownDescriptor &&
    typeof ownDescriptor.set === "function"
  ) {
    ownDescriptor.set.call(
      element,
      value
    );
  } else {
    element.value = value;
  }
}


  /* =====================================================
     TYPE
  ===================================================== */

async function executeType(
  target,
  requestedValue,
  exactSearch,
  pressEnter
) {
  const element = findElement(target);

  if (!element) {
    throw new Error(
      `Element ${target} not found.`
    );
  }

  if (typeof requestedValue !== "string") {
    throw new Error(
      "TYPE requires text."
    );
  }

  if (requestedValue.includes("[PRIVATE_")) {
    throw new Error(
      "Protected values cannot be typed."
    );
  }


  // =====================================================
  // FLAGS
  // =====================================================

  const shouldExactSearch =
    exactSearch === true ||
    String(exactSearch).toLowerCase() === "true";


  const shouldPressEnter =
    pressEnter === true ||
    String(pressEnter).toLowerCase() === "true";


  // =====================================================
  // PREPARE VALUE
  // =====================================================

  let cleanValue =
    requestedValue.trim();


  // Remove quotes if AI accidentally returned them
  cleanValue = cleanValue.replace(
    /^["']+|["']+$/g,
    ""
  );


  /*
    Gemini:
    Scheme Name

    Actual browser input:
    "Scheme Name"
  */

  const finalValue =
    shouldExactSearch
      ? `"${cleanValue}"`
      : cleanValue;


  console.log(
    "BrowseShield TYPE target:",
    target
  );

  console.log(
    "BrowseShield raw value:",
    requestedValue
  );

  console.log(
    "BrowseShield final quoted value:",
    finalValue
  );


  // =====================================================
  // VERIFY THIS REALLY IS AN INPUT
  // =====================================================

  const tag =
    element.tagName.toLowerCase();


  if (
    tag !== "input" &&
    tag !== "textarea" &&
    !element.isContentEditable
  ) {
    throw new Error(
      `Target ${target} is not a text input.`
    );
  }


  // =====================================================
  // MOVE TO SEARCH INPUT
  // =====================================================

  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest"
  });


  await delay(200);


  try {
    element.click();
  } catch (_) {}


  element.focus();


  await delay(150);


  // =====================================================
  // CLEAR EXISTING VALUE
  // =====================================================

  if (
    typeof element.select === "function"
  ) {
    try {
      element.select();
    } catch (_) {}
  }


  setNativeValue(
    element,
    ""
  );


  element.dispatchEvent(
    new InputEvent(
      "input",
      {
        bubbles: true,
        composed: true,
        inputType:
          "deleteContentBackward",
        data: null
      }
    )
  );


  element.dispatchEvent(
    new Event(
      "change",
      {
        bubbles: true,
        composed: true
      }
    )
  );


  await delay(120);


  // =====================================================
  // FIRST METHOD
  // NATIVE SETTER
  // =====================================================

  setNativeValue(
    element,
    finalValue
  );


  element.dispatchEvent(
    new InputEvent(
      "input",
      {
        bubbles: true,
        composed: true,
        inputType:
          "insertText",
        data:
          finalValue
      }
    )
  );


  await delay(150);


  let currentValue =
    element.isContentEditable
      ? element.textContent
      : element.value;


  console.log(
    "BrowseShield first value:",
    currentValue
  );


  // =====================================================
  // SECOND METHOD
  // execCommand fallback for framework-controlled input
  // =====================================================

  if (
    currentValue !== finalValue
  ) {
    console.log(
      "BrowseShield input controlled by page. Using typing fallback."
    );


    element.focus();


    if (
      typeof element.select === "function"
    ) {
      try {
        element.select();
      } catch (_) {}
    }


    try {
      document.execCommand(
        "insertText",
        false,
        finalValue
      );
    } catch (_) {}


    await delay(150);


    currentValue =
      element.isContentEditable
        ? element.textContent
        : element.value;
  }


  // =====================================================
  // THIRD METHOD
  // FORCE NATIVE VALUE AGAIN
  // =====================================================

  if (
    currentValue !== finalValue
  ) {
    setNativeValue(
      element,
      finalValue
    );


    element.dispatchEvent(
      new Event(
        "input",
        {
          bubbles: true,
          composed: true
        }
      )
    );


    element.dispatchEvent(
      new Event(
        "change",
        {
          bubbles: true,
          composed: true
        }
      )
    );


    await delay(200);


    currentValue =
      element.isContentEditable
        ? element.textContent
        : element.value;
  }


  console.log(
    "BrowseShield final textbox value:",
    currentValue
  );


  // =====================================================
  // IMPORTANT:
  // DO NOT SAY SUCCESS IF NOTHING WAS TYPED
  // =====================================================

  if (
    currentValue !== finalValue
  ) {
    throw new Error(
      `Search box rejected value. Expected: ${finalValue}`
    );
  }


  // =====================================================
  // FINAL CHANGE EVENT
  // =====================================================

  element.dispatchEvent(
    new Event(
      "change",
      {
        bubbles: true,
        composed: true
      }
    )
  );


  await delay(200);


  // =====================================================
  // ENTER
  // =====================================================

  if (shouldPressEnter) {

    const keyboardOptions = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      charCode: 13,
      bubbles: true,
      cancelable: true,
      composed: true
    };


    element.dispatchEvent(
      new KeyboardEvent(
        "keydown",
        keyboardOptions
      )
    );


    await delay(40);


    element.dispatchEvent(
      new KeyboardEvent(
        "keypress",
        keyboardOptions
      )
    );


    await delay(40);


    element.dispatchEvent(
      new KeyboardEvent(
        "keyup",
        keyboardOptions
      )
    );


    // -----------------------------------------------------
    // FORM FALLBACK
    // -----------------------------------------------------

    await delay(150);


    const form =
      element.closest("form");


    if (form) {
      try {
        form.dispatchEvent(
          new Event(
            "submit",
            {
              bubbles: true,
              cancelable: true
            }
          )
        );
      } catch (_) {}
    }
  }


  // =====================================================
  // SUCCESS
  // =====================================================

  return {
    action: "TYPE",
    target,
    value: finalValue,
    exactSearch:
      shouldExactSearch,
    pressEnter:
      shouldPressEnter
  };
}


  /* =====================================================
     SCROLL
  ===================================================== */

  function executeScroll(
    direction
  ) {

    const normalized =
      String(
        direction ||
        "DOWN"
      ).toUpperCase();


    window.scrollBy({

      top:
        normalized === "UP"
          ? -700
          : 700,

      behavior:
        "smooth"
    });


    return {

      action:
        "SCROLL",

      direction:
        normalized
    };
  }


  /* =====================================================
     NAVIGATE
  ===================================================== */

  function executeNavigate(
    url
  ) {

    const destination =
      new URL(
        url,
        window.location.href
      );


    if (
      ![
        "http:",
        "https:"
      ].includes(
        destination.protocol
      )
    ) {

      throw new Error(
        "Unsafe navigation URL."
      );
    }


    window.location.href =
      destination.href;


    return {

      action:
        "NAVIGATE",

      url:
        destination.href
    };
  }


  /* =====================================================
     ACTION ENGINE
  ===================================================== */

  async function executeBrowserAction(
    decision
  ) {

    if (
      !decision?.action
    ) {

      throw new Error(
        "Invalid AI decision."
      );
    }


    const action =
      String(
        decision.action
      ).toUpperCase();


    switch (
      action
    ) {

      case "CLICK":

        return await executeClick(
          decision.target
        );


      case "TYPE":

  return await executeType(
    decision.target,
    decision.value,
    decision.exactSearch,
    decision.pressEnter
  );


      case "SCROLL":

        return executeScroll(
          decision.direction
        );


      case "NAVIGATE":

        return executeNavigate(
          decision.url
        );


      case "DONE":

        return {

          action:
            "DONE",

          message:
            decision.message ||
            "Task completed."
        };


      case "NONE":

        return {

          action:
            "NONE",

          message:
            decision.message ||
            "No action required."
        };


      default:

        throw new Error(
          `Unsupported action: ${action}`
        );
    }
  }


  /* =====================================================
     MESSAGE HANDLER
  ===================================================== */

  chrome.runtime.onMessage.addListener(
    (
      request,
      sender,
      sendResponse
    ) => {


      /* -----------------------------------------------
         PING
      ----------------------------------------------- */

      if (
        request.type ===
        "AGENTCORE_PING"
      ) {

        sendResponse({
          success: true
        });

        return true;
      }


      /* -----------------------------------------------
         SCAN
      ----------------------------------------------- */

      if (
        request.type ===
        "GET_PAGE_DATA"
      ) {

        try {

          const data =
            extractPageData();


          sendResponse({
            success: true,
            data
          });


          if (
            request.closeDialogAfterScan
          ) {

            setTimeout(
              () => {

                closeVisibleDialog();

              },
              150
            );
          }

        } catch (
          error
        ) {

          sendResponse({

            success:
              false,

            error:
              error.message
          });
        }


        return true;
      }


      /* -----------------------------------------------
         EXECUTE
      ----------------------------------------------- */

      if (
        request.type ===
        "EXECUTE_ACTION"
      ) {

        executeBrowserAction(
          request.decision
        )
          .then(
            result => {

              sendResponse({

                success:
                  true,

                result
              });
            }
          )
          .catch(
            error => {

              sendResponse({

                success:
                  false,

                error:
                  error.message
              });
            }
          );


        return true;
      }

    }
  );

})();