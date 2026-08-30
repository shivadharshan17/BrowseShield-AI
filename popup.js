const scanButton = document.getElementById("scanButton");
const runButton = document.getElementById("runButton");

const taskInput = document.getElementById("taskInput");

const scanStatus = document.getElementById("scanStatus");

const resultBox = document.getElementById("resultBox");
const resultStatus = document.getElementById("resultStatus");
const resultText = document.getElementById("resultText");


/* =========================================================
   LOCAL POPUP STATE
========================================================= */

let pageScanned = false;
let agentRunning = false;


/* =========================================================
   INITIAL STATE

   IMPORTANT:
   Every time popup opens, user must scan page again.
========================================================= */

runButton.disabled = true;

scanStatus.classList.add("hidden");
resultBox.classList.add("hidden");


/* =========================================================
   SHOW RUNNING SCREEN
========================================================= */

function showRunningStatus(message) {

  resultBox.classList.remove("hidden");

  resultStatus.textContent = "";

  resultText.textContent =
    message || "Analyzing Cloud-Safe page...";
}


/* =========================================================
   SHOW ERROR
========================================================= */

function showError(message) {

  resultBox.classList.remove("hidden");

  resultStatus.textContent = "Error";

  resultText.textContent =
    message || "Something went wrong.";

  runButton.textContent =
    "Run BrowseShield AI";

  scanButton.disabled = false;

  agentRunning = false;

  runButton.disabled = !pageScanned;
}


/* =========================================================
   SHOW COMPLETE RESULT
========================================================= */

function showCompleted(message) {

  resultBox.classList.remove("hidden");

  resultStatus.textContent =
    "✓ Best Match Found";

  resultText.textContent =
    message || "Task completed.";

  runButton.textContent =
    "Run BrowseShield AI";

  scanButton.disabled = false;

  agentRunning = false;

  runButton.disabled = !pageScanned;
}


/* =========================================================
   SCAN PAGE
========================================================= */

scanButton.addEventListener(
  "click",
  async () => {

    if (agentRunning) {
      return;
    }

    pageScanned = false;

    runButton.disabled = true;

    scanButton.disabled = true;

    scanButton.textContent =
      "Scanning...";

    scanStatus.classList.add(
      "hidden"
    );

    resultBox.classList.add(
      "hidden"
    );

    resultStatus.textContent = "";
    resultText.textContent = "";

    try {

      const response =
        await chrome.runtime.sendMessage({
          type: "SCAN_PAGE"
        });


      if (
        !response ||
        response.ok !== true
      ) {

        throw new Error(
          response?.error ||
          "Page scan failed."
        );
      }


      pageScanned = true;

      scanStatus.textContent =
        "✓ Page scanned.";

      scanStatus.classList.remove(
        "hidden"
      );

      runButton.disabled = false;

    } catch (error) {

      pageScanned = false;

      scanStatus.textContent =
        "Scan failed.";

      scanStatus.classList.remove(
        "hidden"
      );

      showError(
        error.message ||
        "Unable to scan page."
      );

    } finally {

      scanButton.textContent =
        "Scan Page";

      scanButton.disabled = false;
    }
  }
);


/* =========================================================
   RUN AGENT
========================================================= */

runButton.addEventListener(
  "click",
  async () => {

    if (!pageScanned) {

      showError(
        "Please scan the page first."
      );

      return;
    }


    if (agentRunning) {
      return;
    }


    const command =
      taskInput.value.trim();


    if (!command) {

      showError(
        "Enter a task for BrowseShield AI."
      );

      return;
    }


    agentRunning = true;

    runButton.disabled = true;
    scanButton.disabled = true;

    runButton.textContent =
      "Running...";


    showRunningStatus(
      "Analyzing Cloud-Safe page..."
    );


    try {

      const response =
        await chrome.runtime.sendMessage({
          type: "START_AGENT",
          command
        });


      if (
        !response ||
        response.ok !== true
      ) {

        throw new Error(
          response?.error ||
          "Unable to start BrowseShield AI."
        );
      }

    } catch (error) {

      showError(
        error.message ||
        "Unable to run BrowseShield AI."
      );
    }
  }
);


/* =========================================================
   BACKGROUND STATUS UPDATES
========================================================= */

chrome.runtime.onMessage.addListener(
  (message) => {

    if (
      !message ||
      message.type !== "AGENT_STATUS"
    ) {

      return;
    }


    const task =
      message.task || message.data || {};


    /* -----------------------------------------------------
       RUNNING
    ----------------------------------------------------- */

    if (task.status === "running") {

      agentRunning = true;

      runButton.disabled = true;
      scanButton.disabled = true;

      runButton.textContent =
        "Running...";


      showRunningStatus(
        task.message ||
        "Analyzing Cloud-Safe page..."
      );

      return;
    }


    /* -----------------------------------------------------
       COMPLETED
    ----------------------------------------------------- */

    if (task.status === "completed") {

      showCompleted(
        task.message ||
        "Task completed."
      );

      return;
    }


    /* -----------------------------------------------------
       ERROR
    ----------------------------------------------------- */

    if (task.status === "error") {

      showError(
        task.error ||
        task.message ||
        "BrowseShield AI encountered an error."
      );

      return;
    }
  }
);