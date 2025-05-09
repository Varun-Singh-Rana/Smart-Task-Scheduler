const { app, BrowserWindow } = require("electron");
const path = require("path");
const db = require("./src/js/database");

const fs = require("fs");
const { ipcMain } = require("electron");

// this is a handler
ipcMain.on("mark-first-run-complete", () => {
  const db = require("./src/js/database");
  db.markAsRun();
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    frame: false, // This removes the title bar and window controls
    titleBarStyle: "hidden", // This hides the title bar but keeps the window controls
    backgroundColor: "#4361ee", // Match your theme color
    show: false, // Start hidden
  });

  // Debug database path
  console.log(
    "Database path:",
    path.join(__dirname, "user_info", "user_data.db")
  );

  // Show splash screen first
  mainWindow.loadFile(path.join(__dirname, "src", "html", "splash.html"));
  mainWindow.show();

  // After 1.5 seconds, check user status
  setTimeout(() => {
    db.getUserInfo((err, userInfo) => {
      let startPage;

      if (err || !userInfo) {
        startPage = "user_info.html";
      } else {
        db.getUserTasks(userInfo.id, (err, tasks) => {
          if (err || !tasks || tasks.length === 0) {
            startPage = "user_setup.html";
          } else {
            startPage = "index.html";
          }
          loadPage(startPage);
        });
        return;
      }
      loadPage(startPage);
    });
  }, 1500);

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));

  mainWindow.on("closed", function () {
    mainWindow = null;
  });

  // Check if the database file exists, if not, create it
  db.getUserInfo((err, userInfo) => {
    let startPage;

    if (err || !userInfo) {
      // First time user - go to user_info.html
      startPage = "user_info.html";
    } else {
      // Existing user - check if tasks are set up
      db.getUserTasks(userInfo.id, (err, tasks) => {
        if (err || !tasks || tasks.length === 0) {
          // User info exists but no tasks - go to user_setup.html
          startPage = "user_setup.html";
        } else {
          // Fully set up - go to index.html
          startPage = "index.html";
        }
        loadPage(startPage);
      });
      return;
    }
    loadPage(startPage);
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    // You could add a splash screen effect here if desired
  });

  // Check user status and load appropriate page
  checkUserStatus();

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

async function checkUserStatus() {
  try {
    const db = require("./src/js/database");
    const userInfo = await db.getUserInfo();

    if (!userInfo) {
      mainWindow.loadFile(
        path.join(__dirname, "src", "html", "user_info.html")
      );
    } else {
      // Check if tasks exist
      const tasks = await new Promise((resolve, reject) => {
        db.db.all(
          "SELECT * FROM user_tasks WHERE user_id = ?",
          [userInfo.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      if (!tasks || tasks.length === 0) {
        mainWindow.loadFile(
          path.join(__dirname, "src", "html", "user_setup.html")
        );
      } else {
        mainWindow.loadFile(path.join(__dirname, "src", "index.html"));
      }
    }
  } catch (err) {
    console.error("Error checking user status:", err);
    mainWindow.loadFile(path.join(__dirname, "src", "html", "user_info.html"));
  }
}

// Window control handlers
ipcMain.on("window-minimize", () => {
  BrowserWindow.getFocusedWindow().minimize();
});

ipcMain.on("window-maximize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.on("window-close", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
  if (mainWindow === null) createWindow();
});
