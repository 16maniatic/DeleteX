## This repository consists of tools to delete all your activity on X (Twitter) without the need to delete your account.

**⚠️ WARNING!**
Executing the selected script will permanently delete everything. You can download your data by following these steps:

[EN] https://help.x.com/en/managing-your-account/accessing-your-x-data
[ES] https://help.x.com/es/managing-your-account/accessing-your-x-data

To run a script, go to your X profile and press "**Ctrl**" + "**Shift**" + "**J**". In the console, type "allow pasting" and press "**Enter**". After that, you can paste the script into the console and execute it using the "**Start**" option located at the top right of X.

Please note that if you delete a large number of items, your profile may appear empty due to "too many requests". It is recommended to wait **24** to **48** hours to avoid a "**Read-Only Mode**", which could last up to **7 days**.

### Unretweets

1. Go to: https://twitter.com/{username}
2. Open the console and run the following JavaScript code:
```javascript
const config = {
    MAX_UNRETWEETS: 5500,
    BASE_WAIT_TIME: 250,
    INCREMENT_WAIT: 200,
    DECREMENT_WAIT: 50,
    RETRY_COUNT: 3,
    RATE_LIMIT_WINDOW: 60 * 1000, 
    RATE_LIMIT_MAX_UNRETWEETS: 50,
    PROGRESS_REPORT_INTERVAL: 60 * 1000,
  };
  
  function fetchRetweets(lastButton = null) {
    const buttons = document.querySelectorAll('[data-testid="unretweet"]');
    if (lastButton) {
      const lastButtonIndex = Array.from(buttons).findIndex(
        (button) => button === lastButton
      );
      return Array.from(buttons).slice(lastButtonIndex + 1);
    }
    return buttons;
  }
  
  function fetchTweetText(button) {
    const tweetElement = button
      .closest("article")
      .querySelector('[data-testid="tweetText"]');
    return tweetElement ? tweetElement.textContent : "No text found";
  }
  
  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  function saveProgress(count) {
    localStorage.setItem("totalUnretweetCount", count);
  }
  
  function loadProgress() {
    return localStorage.getItem("totalUnretweetCount") || 0;
  }
  
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
  let unretweetCount = 0;
  let totalUnretweetCount = loadProgress();
  let errorCount = 0;
  let waitTime = config.BASE_WAIT_TIME;
  let lastUnretweetTime = Date.now();
  let lastProcessedButton = null;
  
  async function unretweetAll() {
    isRunning = true;
    isPaused = false;
    shouldStop = false;
    startButton.disabled = true;
    stopButton.disabled = false;
    pauseButton.disabled = false;
    resumeButton.disabled = true;
  
    const startTime = performance.now();
    let retweetButtons = fetchRetweets();
    let retryCount = 0;
  
    while (
      retweetButtons.length > 0 &&
      unretweetCount < config.MAX_UNRETWEETS &&
      !shouldStop
    ) {
      for (const button of retweetButtons) {
        if (isPaused) {
          await waitForResume();
        }
  
        if (shouldStop) {
          break;
        }
  
        try {
          const tweetText = fetchTweetText(button).slice(0, 150);
          console.log(`Unretweting tweet: "${tweetText}"`);
          button.click();
          console.log(`%cUnretweeted ${++unretweetCount} tweets`, "color: aqua;");
          totalUnretweetCount++;
          saveProgress(totalUnretweetCount);
          updateUI();
          await wait(waitTime);
  
          if (waitTime > 1000 && errorCount === 0) {
            waitTime -= config.DECREMENT_WAIT;
          }
  
          const now = Date.now();
          const elapsedTime = now - lastUnretweetTime;
          if (elapsedTime < config.RATE_LIMIT_WINDOW) {
            const unretweets = unretweetCount - loadProgress();
            if (unretweets >= config.RATE_LIMIT_MAX_UNRETWEETS) {
              const remainingTime = config.RATE_LIMIT_WINDOW - elapsedTime;
              console.log(
                `Rate limit reached, waiting ${remainingTime / 1000} seconds`
              );
              await wait(remainingTime);
            }
          }
          lastUnretweetTime = now;
          retryCount = 0;
          lastProcessedButton = button;
        } catch (error) {
          console.error(`%cError unretweting tweet: ${error}`, "color: red;");
          errorCount++;
          updateError(error);
          waitTime += config.INCREMENT_WAIT;
          retryCount++;
  
          if (retryCount >= config.RETRY_COUNT) {
            break;
          }
        }
      }
  
      if (errorCount === 0 && retweetButtons.length > 0) {
        window.scrollTo(0, document.body.scrollHeight);
        await wait(3000);
        retweetButtons = fetchRetweets(lastProcessedButton);
      } else {
        errorCount = 0;
      }
    }
  
    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000;
    console.log(`%cUnretweeted this session: ${unretweetCount}`, "color: aquamarine;");
    console.log(
      `%cTotal unretweeted with RapidUnretweet = ${totalUnretweetCount}`,
      "color: aquamarine;"
    );
    console.log(
      `%cTotal time taken: ${totalTime.toFixed(2)} seconds`,
      "color: aquamarine;"
    );
  
    isRunning = false;
    startButton.disabled = false;
    stopButton.disabled = true;
    pauseButton.disabled = true;
    resumeButton.disabled = true;
    unretweetCount = 0;
  }
  
  function updateUI() {
    statusText.textContent = `Unretweeted this session: ${unretweetCount} | Total unretweeted with RapidUnretweet: ${totalUnretweetCount}`;
  
    if (isRunning && !shouldStop) {
      setTimeout(updateUI, config.PROGRESS_REPORT_INTERVAL);
    }
  }
  
  function updateError(error) {
    errorText.textContent = `Error: ${error}`;
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
  
  startButton.addEventListener("click", unretweetAll);
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
  ```

  