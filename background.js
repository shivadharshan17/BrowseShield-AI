const BACKEND_URL =
  "http://127.0.0.1:8000/agent";

const STORAGE_KEY =
  "agentcoreTask";

const MAX_AGENT_STEPS =
  3;


/* =====================================================
   UTILITY
===================================================== */

function delay(ms) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}


/* =====================================================
   STORAGE
===================================================== */

async function getTask() {

  const data =
    await chrome.storage.local.get(
      STORAGE_KEY
    );

  return (
    data[STORAGE_KEY] ||
    null
  );
}


async function saveTask(task) {

  await chrome.storage.local.set({
    [STORAGE_KEY]:
      task
  });


  try {

    chrome.runtime.sendMessage({

      type:
        "AGENT_STATUS",

      task

    }).catch(() => {});

  } catch (_) {}


  return task;
}


async function updateTask(
  changes
) {

  const current =
    await getTask() ||
    {};


  const updated = {

    ...current,

    ...changes
  };


  return saveTask(
    updated
  );
}


/* =====================================================
   ACTIVE TAB
===================================================== */

async function getActiveTab() {

  const tabs =
    await chrome.tabs.query({

      active:
        true,

      currentWindow:
        true
    });


  if (!tabs.length) {

    throw new Error(
      "No active browser tab found."
    );
  }


  const tab =
    tabs[0];


  if (!tab.id) {

    throw new Error(
      "Unable to access active tab."
    );
  }


  return tab;
}


/* =====================================================
   CONTENT SCRIPT
===================================================== */

async function pingContentScript(
  tabId
) {

  try {

    const response =
      await chrome.tabs.sendMessage(
        tabId,
        {
          type:
            "AGENTCORE_PING"
        }
      );


    return Boolean(
      response?.success
    );

  } catch (_) {

    return false;
  }
}


async function ensureContentScript(
  tabId
) {

  if (
    await pingContentScript(
      tabId
    )
  ) {

    return;
  }


  try {

    await chrome.scripting.executeScript({

      target: {
        tabId
      },

      files: [
        "content.js"
      ]
    });


    await delay(
      150
    );


    if (
      !await pingContentScript(
        tabId
      )
    ) {

      throw new Error(
        "Content script did not respond."
      );
    }

  } catch (_) {

    throw new Error(
      "BrowseShield AI cannot access this page. Refresh the webpage and try again."
    );
  }
}


/* =====================================================
   SEND TO PAGE
===================================================== */

async function sendToTab(
  tabId,
  message
) {

  await ensureContentScript(
    tabId
  );


  return chrome.tabs.sendMessage(
    tabId,
    message
  );
}


/* =====================================================
   SCAN PAGE
===================================================== */

async function scanPage(
  tabId,
  closeDialogAfterScan = true
) {

  const response =
    await sendToTab(
      tabId,
      {

        type:
          "GET_PAGE_DATA",

        closeDialogAfterScan
      }
    );


  if (!response) {

    throw new Error(
      "Page scan returned no data."
    );
  }


  if (
    response.success ===
    false
  ) {

    throw new Error(
      response.error ||
      "Page scan failed."
    );
  }


  if (!response.data) {

    throw new Error(
      "Page data missing."
    );
  }


  /*
    content.js:

    {
      sanitized: {...},
      privacySummary: {...}
    }

    Only sanitized information leaves
    the webpage layer.
  */

  if (
    response.data.sanitized
  ) {

    return (
      response.data.sanitized
    );
  }


  return response.data;
}


/* =====================================================
   BACKEND
===================================================== */

async function askBackend({
  command,
  page,
  memory,
  history
}) {

  let response;


  try {

    response =
      await fetch(
        BACKEND_URL,
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              command,

              page,

              memory:
                Array.isArray(memory)
                  ? memory.slice(-3)
                  : [],

              history:
                (history || [])
                  .slice(-1)
            })
        }
      );

  } catch (_) {

    throw new Error(
      "Failed to fetch. Make sure BrowseShield AI backend is running."
    );
  }


  let data =
    null;


  try {

    data =
      await response.json();

  } catch (_) {}


  if (
    !response.ok
  ) {

    const detail =

      data?.detail ||
      data?.error ||
      `Backend error ${response.status}`;


    throw new Error(
      typeof detail ===
      "string"

        ? detail

        : JSON.stringify(
            detail
          )
    );
  }


  if (
    !data ||
    !data.action
  ) {

    console.error(
      "Invalid backend response:",
      data
    );


    throw new Error(
      "Invalid AI decision."
    );
  }


  return data;
}


/* =====================================================
   EXECUTE ACTION
===================================================== */

async function executeAction(
  tabId,
  decision
) {

  const response =
    await sendToTab(
      tabId,
      {

        type:
          "EXECUTE_ACTION",

        /*
          IMPORTANT:
          content.js expects
          request.decision
        */

        decision
      }
    );


  if (!response) {

    throw new Error(
      "Browser action returned no response."
    );
  }


  if (
    response.success ===
    false
  ) {

    throw new Error(
      response.error ||
      "Browser action failed."
    );
  }


  return (
    response.result ||
    response
  );
}


/* =====================================================
   FINAL MESSAGE FORMAT
===================================================== */

function formatMessage(
  message
) {

  return String(
    message || ""
  )
    .trim()
    .replace(
      /\s+Reason:\s*/i,
      "\n\nReason: "
    );
}


/* =====================================================
   RUN AGENT
===================================================== */

async function runAgent(
  command
) {

  const tab =
    await getActiveTab();


  await ensureContentScript(
    tab.id
  );


  /*
    IMPORTANT FIX:

    Do NOT start with memory = [].

    The manual scan already captured
    sanitized safe profile/context.
  */

  const previousTask =
    await getTask();


  let memory =
    Array.isArray(
      previousTask?.memory
    )

      ? previousTask.memory.slice(
          -3
        )

      : [];


  let history =
    [];


  console.log(
    "BrowseShield preserved safe context:",
    memory
  );


  for (
    let step = 0;
    step < MAX_AGENT_STEPS;
    step++
  ) {


    /* -----------------------------------------------
       STATUS
    ----------------------------------------------- */

    await updateTask({

      status:
        "running",

      message:
        "Analyzing Cloud-Safe page...",

      memory,

      error:
        null
    });


    /* -----------------------------------------------
       CURRENT PAGE
    ----------------------------------------------- */

    const page =
      await scanPage(
        tab.id,
        false
      );


    console.log(
      "BrowseShield Cloud-Safe page:",
      page
    );


    /* -----------------------------------------------
       GEMINI
    ----------------------------------------------- */

    const decision =
      await askBackend({

        command,

        page,

        memory,

        history
      });


    console.log(
      "BrowseShield AI decision:",
      decision
    );


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


    /*
      Do not destroy the original safe
      scan context if Gemini returns
      memory: [].
    */

    if (
      Array.isArray(
        decision.memory
      ) &&
      decision.memory.length >
        0
    ) {

      memory =
        decision.memory.slice(
          -3
        );
    }


    /* -----------------------------------------------
       DONE
    ----------------------------------------------- */

    if (
      action ===
      "DONE"
    ) {

      await updateTask({

        status:
          "completed",

        message:
          formatMessage(
            decision.message ||
            "Task completed."
          ),

        memory,

        error:
          null
      });


      return;
    }


    /* -----------------------------------------------
       NONE
    ----------------------------------------------- */

    if (
      action ===
      "NONE"
    ) {

      await updateTask({

        status:
          "completed",

        message:
          formatMessage(
            decision.message ||
            "No additional action is required."
          ),

        memory,

        error:
          null
      });


      return;
    }


    /*
      No SCROLL in current matching demo.
    */

    const supported = [

      "CLICK",
      "TYPE",
      "NAVIGATE"
    ];


    if (
      !supported.includes(
        action
      )
    ) {

      throw new Error(
        `Invalid AI decision: ${action}`
      );
    }


    /* -----------------------------------------------
       ACTION STATUS
    ----------------------------------------------- */

    let executionMessage =
      "Performing selected action...";


    if (
      action ===
        "TYPE" &&
      decision.exactSearch
    ) {

      executionMessage =
        "Searching selected result...";
    }


    if (
      action ===
      "CLICK"
    ) {

      executionMessage =
        "Opening selected result...";
    }


    if (
      action ===
      "NAVIGATE"
    ) {

      executionMessage =
        "Opening selected page...";
    }


    await updateTask({

      status:
        "running",

      message:
        executionMessage,

      memory,

      error:
        null
    });


    /* -----------------------------------------------
       EXECUTE LOCALLY
    ----------------------------------------------- */

    const execution =
      await executeAction(
        tab.id,
        decision
      );


    console.log(
      "BrowseShield execution:",
      execution
    );


    /* -----------------------------------------------
       FAST COMPLETE

       Browser action already happened.

       Do not send another Gemini request
       if Gemini already supplied result text.
    ----------------------------------------------- */

    if (
      decision.message &&
      decision.message.trim()
    ) {

      await delay(
        300
      );


      await updateTask({

        status:
          "completed",

        message:
          formatMessage(
            decision.message
          ),

        memory,

        error:
          null
      });


      return;
    }


    /* -----------------------------------------------
       FALLBACK HISTORY
    ----------------------------------------------- */

    history.push({

      action,

      target:
        decision.target ||
        null,

      value:
        decision.value ||
        null,

      exactSearch:
        Boolean(
          decision.exactSearch
        ),

      pressEnter:
        Boolean(
          decision.pressEnter
        )
    });


    history =
      history.slice(
        -1
      );


    await delay(
      350
    );
  }


  await updateTask({

    status:
      "completed",

    message:
      "BrowseShield AI completed the available browser actions.",

    memory,

    error:
      null
  });
}


/* =====================================================
   START
===================================================== */

async function startAgent(
  command
) {

  /*
    IMPORTANT FIX:

    Preserve memory generated by Scan Page.
  */

  const previous =
    await getTask();


  const existingMemory =
    Array.isArray(
      previous?.memory
    )

      ? previous.memory.slice(
          -3
        )

      : [];


  await saveTask({

    ...(previous || {}),

    status:
      "running",

    command,

    message:
      "Analyzing Cloud-Safe page...",

    memory:
      existingMemory,

    history:
      [],

    error:
      null
  });


  runAgent(
    command
  )
    .catch(
      async error => {

        console.error(
          "BrowseShield AI:",
          error
        );


        await updateTask({

          status:
            "error",

          error:
            error.message ||
            "BrowseShield AI failed.",

          message:
            null
        });
      }
    );


  return {
    ok: true
  };
}


/* =====================================================
   MANUAL SCAN
===================================================== */

async function manualScan() {

  const tab =
    await getActiveTab();


  /*
    At this stage the profile / user-context
    dialog is still visible.

    content.js sanitizes it first.

    Then closeDialogAfterScan causes the
    visible dialog to close.
  */

  const data =
    await scanPage(
      tab.id,
      true
    );


  /*
    IMPORTANT FIX:

    Store only sanitized safe information
    from this first scan.

    Private values remain as:
    [PRIVATE_AGE]
    [PRIVATE_GENDER]
    etc.

    Safe fields such as occupation /
    employment type remain usable.
  */

  const safeContext =
    String(
      data?.visibleText ||
      ""
    )
      .trim()
      .slice(
        0,
        3000
      );


  const memory =
    safeContext

      ? [
          `SAFE SCANNED CONTEXT:\n${safeContext}`
        ]

      : [];


  console.log(
    "BrowseShield safe scan memory:",
    memory
  );


  const previous =
    await getTask();


  await saveTask({

    ...(previous || {}),

    status:
      "idle",

    message:
      "✓ Page scanned successfully.",

    privacyProtected:
      true,

    /*
      Preserve sanitized context for
      subsequent scheme matching.
    */

    memory,

    history:
      [],

    error:
      null
  });


  return data;
}


/* =====================================================
   MESSAGE HANDLER
===================================================== */

chrome.runtime.onMessage.addListener(
  (
    message,
    sender,
    sendResponse
  ) => {


    if (!message?.type) {
      return;
    }


    /* -----------------------------------------------
       SCAN
    ----------------------------------------------- */

    if (
      message.type ===
      "SCAN_PAGE"
    ) {

      manualScan()
        .then(
          data => {

            sendResponse({

              ok:
                true,

              data
            });
          }
        )
        .catch(
          error => {

            sendResponse({

              ok:
                false,

              error:
                error.message ||
                "Page scan failed."
            });
          }
        );


      return true;
    }


    /* -----------------------------------------------
       START
    ----------------------------------------------- */

    if (
      message.type ===
      "START_AGENT"
    ) {

      const command =
        String(
          message.command ||
          ""
        ).trim();


      if (!command) {

        sendResponse({

          ok:
            false,

          error:
            "Task is empty."
        });


        return true;
      }


      startAgent(
        command
      )
        .then(
          sendResponse
        )
        .catch(
          error => {

            sendResponse({

              ok:
                false,

              error:
                error.message
            });
          }
        );


      return true;
    }


    /* -----------------------------------------------
       STATE
    ----------------------------------------------- */

    if (
      message.type ===
      "GET_AGENT_STATE"
    ) {

      getTask()
        .then(
          task => {

            sendResponse({

              ok:
                true,

              task
            });
          }
        );


      return true;
    }

  }
);


console.log(
  "BrowseShield AI background service worker loaded."
);