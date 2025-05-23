const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DB_DIR = path.join(__dirname, "..", "..", "user_info");
const DB_PATH = path.join(DB_DIR, "user_data.db");

// Ensure the user_info directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Database error:", err);
  } else {
    console.log("Connected to SQLite database");
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS user_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        off_days TEXT,
        is_setup_complete BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS user_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        task_name TEXT NOT NULL,
        task_time TEXT NOT NULL,
        due_date DATE NOT NULL,
        priority TEXT NOT NULL,
        completed BOOLEAN DEFAULT 0,
        completed_at TEXT DEFAULT NULL,
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
function saveUserInfo(name, startTime, endTime, offDays) {
  return new Promise((resolve, reject) => {
    console.log("Attempting to save user info..."); // Debug log
    db.get(
      `SELECT id FROM user_info WHERE is_setup_complete = 1 ORDER BY id DESC LIMIT 1`,
      (err, row) => {
        if (err) return reject(err);

        if (row) {
          // Update existing user
          db.run(
            `UPDATE user_info SET name = ?, start_time = ?, end_time = ?, off_days = ? WHERE id = ?`,
            [name, startTime, endTime, JSON.stringify(offDays), row.id],
            function (err) {
              if (err) return reject(err);
              resolve(row.id);
            }
          );
        } else {
          db.run(
            `INSERT INTO user_info (name, start_time, end_time, off_days, is_setup_complete) VALUES (?, ?, ?, ?, ?)`,
            [name, startTime, endTime, JSON.stringify(offDays), 1],
            function (err) {
              if (err) {
                console.error("Database save error:", err);
                return reject(err);
              }
              console.log("Saved with ID:", this.lastID);
              resolve(this.lastID);
            }
          );
        }
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

        const userInfo = {
          id: row.id,
          name: row.name,
          start_time: row.start_time,
          end_time: row.end_time,
          offDays: row.off_days ? JSON.parse(row.off_days) : [],
          created_at: row.created_at,
        };
        resolve(userInfo);
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
    `INSERT INTO user_tasks (user_id, task_name, task_time, due_date, priority, completed) 
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  tasks.forEach((task) => {
    stmt.run(
      [
        userId,
        encryptedTaskName,
        encryptedTaskTime,
        task.due_date,
        encryptedPriority,
        task.completed ? 1 : 0,
      ],
      (err) => {
        if (err) {
          console.error("Error saving task:", err);
          callback(err);
        }
      }
    );
  });

  stmt.finalize(callback);
}

//TO get user tasks
function addTask(task) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO user_tasks (user_id, task_name, task_time, due_date, priority, completed) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        task.user_id,
        task.task_name,
        task.task_time,
        task.due_date,
        task.priority,
        task.completed ? 1 : 0,
      ],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

//TO get markTask Completed
function markTaskCompleted(taskId) {
  return new Promise((resolve, reject) => {
    const completedAt = new Date().toISOString();
    db.run(
      `UPDATE user_tasks SET completed = 1, completed_at = ? WHERE id = ?`,
      [completedAt, taskId],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Get user tasks
function getUserTasks(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM user_tasks WHERE user_id = ? ORDER BY task_time`,
      [userId],
      (err, rows) => {
        if (err) return reject(err);

        const tasks = rows.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          task_name: row.task_name,
          task_time: row.task_time,
          due_date: row.due_date,
          priority: row.priority,
          completed: !!row.completed,
          completed_at: row.completed_at,
          created_at: row.created_at,
        }));
        resolve(tasks);
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
  addTask,
  markTaskCompleted,
  getUserTasks,
  db,
};
