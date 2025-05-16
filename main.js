const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const db = require("./src/js/database");

let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      enableRemoteModule: true,
      sandbox: false,

      autoplayPolicy: "document-user-activation-required",
    },
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#4361ee",
    show: false,
  });

  // Show splash screen first
  mainWindow.loadFile(path.join(__dirname, "src", "html", "splash.html"));
  mainWindow.show();

  // After 1.5 seconds, check user status
  setTimeout(async () => {
    try {
      const userInfo = await db.getUserInfo();
      const hasTasks = userInfo
        ? (await db.getUserTasks(userInfo.id))?.length
        : false;
      const pageToLoad = !userInfo
        ? (await db.isFirstRun())
          ? "user_info.html"
          : "user_info.html?error=setup_incomplete"
        : hasTasks
        ? "index.html"
        : "user_setup.html";

      loadPage(pageToLoad);
    } catch (err) {
      console.error("Startup error:", err);
      loadPage("user_info.html?error=startup_error");
    }
  }, 1500);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function loadPage(page) {
  // Split page and query string
  const [file, queryString] = page.split("?");
  const pagePath = path.join(__dirname, "src", "html", file);
  console.log("Loading:", pagePath);

  // Parse query string into an object
  let query = {};
  if (queryString) {
    query = Object.fromEntries(new URLSearchParams(queryString));
  }

  mainWindow.loadFile(pagePath, { query }).catch((err) => {
    console.error("Failed to load page:", err);
    mainWindow.loadFile(path.join(__dirname, "src", "html", "user_info.html"));
  });
}

// IPC Handlers
ipcMain.on("navigate-to", (event, page, queryParams = {}) => {
  const queryString = new URLSearchParams(queryParams).toString();
  const url = `${page}${queryString ? `?${queryString}` : ""}`;
  loadPage(url);
});

ipcMain.handle(
  "save-user-info",
  async (event, { name, startTime, endTime, offDays }) => {
    try {
      // Adjust the function and arguments as needed for your database.js
      return await db.saveUserInfo(name, startTime, endTime, offDays);
    } catch (err) {
      console.error("Failed to save user info:", err);
      throw err;
    }
  }
);

ipcMain.handle("get-user-info", async (event, userId) => {
  try {
    return await db.getUserInfo();
  } catch (err) {
    console.error("Failed to fetch user info:", err);
    throw err;
  }
});

ipcMain.handle("get-user-tasks", async (event, userId) => {
  try {
    return await db.getUserTasks(userId);
  } catch (err) {
    console.error("Failed to fetch user info:", err);
    throw err;
  }
});

// check for user day off
ipcMain.handle("check-user-off-day", async (event, dateStr) => {
  try {
    // to get user info
    const userInfo = await db.getUserInfo();
    if (!userInfo || !userInfo.offDays) return false;

    // offDays is an array of strings
    return userInfo.offDays.includes(dateStr);
  } catch (err) {
    console.error("Failed to check user off day:", err);
    return false;
  }
});

// add-task
ipcMain.handle("add-task", async (event, task) => {
  try {
    await db.addTask(task);
    return true;
  } catch (err) {
    console.error("Failed to add task:", err);
    throw err;
  }
});

ipcMain.handle("mark-task-completed", async (event, taskId) => {
  try {
    await db.markTaskCompleted(taskId);
    return true;
  } catch (err) {
    console.error("Failed to mark task completed:", err);
    throw err;
  }
});

ipcMain.handle("complete-setup", async (event, userId) => {
  try {
    await db.completeSetup(userId);
    return true;
  } catch (err) {
    console.error("Failed to complete setup:", err);
    throw err;
  }
});

ipcMain.on("window-minimize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

ipcMain.on("window-maximize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on("window-close", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

app.whenReady().then(() => {
  console.log("App path:", __dirname);
  console.log("Current working directory:", process.cwd());
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
