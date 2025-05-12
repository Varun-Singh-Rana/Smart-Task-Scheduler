const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const CryptoJS = require("crypto-js");

const DB_DIR = path.join(__dirname, "..", "..", "user_info");
const DB_PATH = path.join(DB_DIR, "user_data.db");

// Ensure the user_info directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const ENCRYPTION_KEY = "i85cIN9tiEZ+r1eBeK/+x3qg5sexnjYmQBHk1Ziywaiyf+SWaSM7Z";

function encryptData(data) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
}

function decryptData(ciphertext) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Database error:", err);
  } else {
    console.log("Connected to SQLite database");
    // Use serialized execution for table creation
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS user_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        wake_time TEXT NOT NULL,
        sleep_time TEXT NOT NULL,
        is_setup_complete BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS user_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        task_name TEXT NOT NULL,
        task_time TEXT NOT NULL,
        priority TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES user_info(id)
      )`);
    });
  }
});

// Check if first run (now database-based)
function isFirstRun() {
  return new Promise((resolve) => {
    db.get("SELECT COUNT(*) as count FROM user_info", (err, row) => {
      resolve(row.count === 0);
    });
  });
}

// Save user info with setup status
function saveUserInfo(name, wakeTime, sleepTime) {
  return new Promise((resolve, reject) => {
    console.log("Attempting to save user info..."); // Debug log
    const encryptedName = encryptData(name);
    const encryptedWakeTime = encryptData(wakeTime);
    const encryptedSleepTime = encryptData(sleepTime);
    db.run(
      `INSERT INTO user_info (name, wake_time, sleep_time, is_setup_complete) 
       VALUES (?, ?, ?, ?)`,
      [encryptedName, encryptedWakeTime, encryptedSleepTime, false],
      function (err) {
        if (err) {
          console.error("Database save error:", err); // Detailed error logging
          return reject(err);
        }
        console.log("Saved with ID:", this.lastID); // Debug log
        resolve(this.lastID);
      }
    );
  });
}

// Get user info with verification
function getUserInfo() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM user_info 
       WHERE is_setup_complete = 1 
       ORDER BY id DESC LIMIT 1`,
      (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(null);

        try {
          const decryptedRow = {
            id: row.id,
            name: decryptData(row.name),
            wake_time: decryptData(row.wake_time),
            sleep_time: decryptData(row.sleep_time),
            created_at: row.created_at,
          };
          resolve(decryptedRow);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

// Mark setup as complete
function completeSetup(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE user_info SET is_setup_complete = 1 WHERE id = ?`,
      [userId],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

// Save user tasks
function saveUserTasks(userId, tasks, callback) {
  const stmt = db.prepare(
    `INSERT INTO user_tasks (user_id, task_name, task_time, priority) VALUES (?, ?, ?, ?)`
  );

  tasks.forEach((task) => {
    const encryptedTaskName = encryptData(task.name);
    const encryptedTaskTime = encryptData(task.time);
    const encryptedPriority = encryptData(task.priority);

    stmt.run([userId, encryptedTaskName, encryptedTaskTime, encryptedPriority]);
  });

  stmt.finalize(callback);
}

// Get user tasks
function getUserTasks(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM user_tasks WHERE user_id = ? ORDER BY task_time`,
      [userId],
      (err, rows) => {
        if (err) return reject(err);

        try {
          const decryptedRows = rows.map((row) => ({
            id: row.id,
            user_id: row.user_id,
            task_name: decryptData(row.task_name),
            task_time: decryptData(row.task_time),
            priority: decryptData(row.priority),
            created_at: row.created_at,
          }));
          resolve(decryptedRows);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

module.exports = {
  isFirstRun,
  saveUserInfo,
  getUserInfo,
  completeSetup,
  saveUserTasks,
  getUserTasks,
  db,
};
