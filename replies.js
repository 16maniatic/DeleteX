// Configuration
const config = {
    MAX_DELETES: 5500,
    BASE_WAIT_TIME: 1000,
    INCREMENT_WAIT: 500,
    DECREMENT_WAIT: 50,
    RETRY_COUNT: 3,
    RATE_LIMIT_WINDOW: 60 * 1000,
    RATE_LIMIT_MAX_DELETES: 50,
    PROGRESS_REPORT_INTERVAL: 60 * 1000,
    DELETE_TERMS: ["Delete", "Eliminar", "Supprimer", "Löschen", "删除", "削除する"],
  };
  
  // Helper functions
  async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async function waitForElement(selector, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await wait(100);
    }
    throw new Error(`Element ${selector} not found after ${timeout}ms`);
  }
  
  // Multi-language delete button finder
  function findDeleteButton() {
    const menuItems = document.querySelectorAll('div[role="menuitem"]');
    return Array.from(menuItems).find(item =>
      config.DELETE_TERMS.some(term => item.textContent.includes(term))
    );
  }
  
  async function waitForDeleteButton(timeout = 5000) {
    const start = Date.now();
    let btn = null;
    while (Date.now() - start < timeout) {
      btn = findDeleteButton();
      if (btn) return btn;
      await wait(100);
    }
    throw new Error("Delete button not found within timeout");
  }
  
  function fetchDeleteButtons(lastButton = null) {
    const buttons = document.querySelectorAll('[data-testid="caret"]');
    if (lastButton) {
      const lastButtonIndex = Array.from(buttons).findIndex(
        (button) => button === lastButton
      );
      return Array.from(buttons).slice(lastButtonIndex + 1);
    }
    return buttons;
  }
  
  function getTweetText(button) {
    const tweetElement = button.closest("article").querySelector('[data-testid="tweetText"]');
    return tweetElement ? tweetElement.textContent : "No text found";
  }
  
  function saveProgress(count) {
    localStorage.setItem("totalDeleteCount", count);
  }
  
  function loadProgress() {
    return localStorage.getItem("totalDeleteCount") || 0;
  }
  
  // UI elements
  const uiContainer = document.createElement("div");
  uiContainer.style.position = "fixed";
  uiContainer.style.top = "10px";
  uiContainer.style.right = "10px";
  uiContainer.style.backgroundColor = "#333";
  uiContainer.style.color = "#fff";
  uiContainer.style.padding = "10px";
  uiContainer.style.zIndex = "9999";
  
  const startButton = document.createElement("button");
  startButton.textContent = "Start";
  startButton.style.marginRight = "10px";
  const stopButton = document.createElement("button");
  stopButton.textContent = "Stop";
  stopButton.disabled = true;
  stopButton.style.marginRight = "10px";
  const pauseButton = document.createElement("button");
  pauseButton.textContent = "Pause";
  pauseButton.disabled = true;
  pauseButton.style.marginRight = "10px";
  const resumeButton = document.createElement("button");
  resumeButton.textContent = "Resume";
  resumeButton.disabled = true;
  const statusText = document.createElement("div");
  statusText.style.marginTop = "10px";
  const errorText = document.createElement("div");
  errorText.style.marginTop = "5px";
  
  uiContainer.appendChild(startButton);
  uiContainer.appendChild(stopButton);
  uiContainer.appendChild(pauseButton);
  uiContainer.appendChild(resumeButton);
  uiContainer.appendChild(statusText);
  uiContainer.appendChild(errorText);
  document.body.appendChild(uiContainer);
  
  let isRunning = false;
  let isPaused = false;
  let shouldStop = false;
  let deleteCount = 0;
  let totalDeleteCount = loadProgress();
  let errorCount = 0;
  let waitTime = config.BASE_WAIT_TIME;
  let lastDeleteTime = Date.now();
  let lastProcessedButton = null;
  
  async function deleteAllTweets() {
    isRunning = true;
    isPaused = false;
    shouldStop = false;
    startButton.disabled = true;
    stopButton.disabled = false;
    pauseButton.disabled = false;
    resumeButton.disabled = true;
  
    const startTime = performance.now();
    let deleteButtons = fetchDeleteButtons();
    let retryCount = 0;
  
    while (
      deleteButtons.length > 0 &&
      deleteCount < config.MAX_DELETES &&
      !shouldStop
    ) {
      for (const button of deleteButtons) {
        if (isPaused) {
          await waitForResume();
        }
        if (shouldStop) {
          break;
        }
        try {
          const tweetText = getTweetText(button).slice(0, 150);
          console.log(`Processing tweet: "${tweetText}"`);
          
          // Open tweet menu
          button.click();
          await wait(800);
          
          // Find delete option using multi-language support
          const deleteOption = await waitForDeleteButton(3000);
          deleteOption.click();
          await wait(800);
          
          // Confirm deletion
          const confirmButton = await waitForElement(
            '[data-testid="confirmationSheetConfirm"]',
            3000
          );
          confirmButton.click();
          await wait(waitTime);
          
          console.log(`%cDeleted ${++deleteCount} tweets`, "color: aqua;");
          totalDeleteCount++;
          saveProgress(totalDeleteCount);
          updateUI();
          
          // Adaptive timing
          if (waitTime > 1000 && errorCount === 0) {
            waitTime -= config.DECREMENT_WAIT;
          }
          
          // Rate limiting
          const now = Date.now();
          const elapsedTime = now - lastDeleteTime;
          if (elapsedTime < config.RATE_LIMIT_WINDOW) {
            const deletes = deleteCount - loadProgress();
            if (deletes >= config.RATE_LIMIT_MAX_DELETES) {
              const remainingTime = config.RATE_LIMIT_WINDOW - elapsedTime;
              console.log(`Rate limit reached, waiting ${remainingTime / 1000} seconds`);
              await wait(remainingTime);
            }
          }
          lastDeleteTime = now;
          retryCount = 0;
          lastProcessedButton = button;
        } catch (error) {
          console.error(`%cError deleting tweet: ${error}`, "color: red;");
          errorCount++;
          updateError(error);
          waitTime += config.INCREMENT_WAIT;
          retryCount++;
          
          // Close any open menus
          document.body.click();
          await wait(1000);
          
          if (retryCount >= config.RETRY_COUNT) {
            break;
          }
        }
      }
      if (errorCount === 0 && deleteButtons.length > 0) {
        window.scrollTo(0, document.body.scrollHeight);
        await wait(3000);
        deleteButtons = fetchDeleteButtons(lastProcessedButton);
      } else {
        errorCount = 0;
      }
    }
  
    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000;
    console.log(`%cDeleted this session: ${deleteCount}`, "color: aquamarine;");
    console.log(`%cTotal deleted: ${totalDeleteCount}`, "color: aquamarine;");
    console.log(`%cTotal time: ${totalTime.toFixed(2)} seconds`, "color: aquamarine;");
  
    isRunning = false;
    startButton.disabled = false;
    stopButton.disabled = true;
    pauseButton.disabled = true;
    resumeButton.disabled = true;
    deleteCount = 0;
  }
  
  function updateUI() {
    statusText.textContent = `Deleted this session: ${deleteCount} | Total deleted: ${totalDeleteCount}`;
    if (isRunning && !shouldStop) {
      setTimeout(updateUI, config.PROGRESS_REPORT_INTERVAL);
    }
  }
  
  function updateError(error) {
    errorText.textContent = `Error: ${error.message || error}`;
  }
  
  function waitForResume() {
    return new Promise((resolve) => {
      const checkResume = () => {
        if (!isPaused) {
          resolve();
        } else {
          setTimeout(checkResume, 1000);
        }
      };
      checkResume();
    });
  }
  
  startButton.addEventListener("click", deleteAllTweets);
  stopButton.addEventListener("click", () => {
    shouldStop = true;
  });
  pauseButton.addEventListener("click", () => {
    isPaused = true;
    pauseButton.disabled = true;
    resumeButton.disabled = false;
  });
  resumeButton.addEventListener("click", () => {
    isPaused = false;
    pauseButton.disabled = false;
    resumeButton.disabled = true;
  });
  