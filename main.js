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
      nodeIntegration: true,
      contextIsolation: false,
      enablePreferredSizeMode: false,
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

      if (!userInfo) {
        // Check if first run
        const firstRun = await db.isFirstRun();
        loadPage(
          firstRun ? "user_info.html" : "user_info.html?error=setup_incomplete"
        );
      } else {
        const tasks = await db.getUserTasks(userInfo.id);
        loadPage(tasks?.length ? "index.html" : "user_setup.html");
      }
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
  const pagePath = path.join(__dirname, "src", "html", page);
  console.log("Loading:", pagePath); // Add for debugging
  mainWindow.loadFile(pagePath).catch((err) => {
    console.error("Failed to load page:", err);
    mainWindow.loadFile(path.join(__dirname, "src", "html", "user_info.html"));
  });
}

// IPC Handlers
ipcMain.handle("save-user-info", async (event, userData) => {
  try {
    return await db.saveUserInfo(
      userData.name,
      userData.wakeTime,
      userData.sleepTime
    );
  } catch (err) {
    console.error("Failed to save user info:", err);
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
