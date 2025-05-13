const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const CryptoJS = require("crypto-js");

// Database path (same as in your actual app)
const DB_DIR = path.join(__dirname, "user_info");
const DB_PATH = path.join(DB_DIR, "user_data.db");

// Create directory if it doesn't exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Encryption key (same as in your app)
const ENCRYPTION_KEY = "i85cIN9tiEZ+r1eBeK/+x3qg5sexnjYmQBHk1Ziywaiyf+SWaSM7Z";

function encryptData(data) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
}

// Create and connect to database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Database error:", err);
    return;
  }

  console.log("Connected to SQLite database");

  // Create tables
  db.serialize(() => {
    // Create user_info table
    db.run(`CREATE TABLE IF NOT EXISTS user_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      wake_time TEXT NOT NULL,
      sleep_time TEXT NOT NULL,
      is_setup_complete BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create user_tasks table
    db.run(`CREATE TABLE IF NOT EXISTS user_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      task_name TEXT NOT NULL,
      task_time TEXT NOT NULL,
      due_date TEXT NOT NULL,
      priority TEXT NOT NULL,
      completed BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES user_info(id)
    )`);

    // Insert sample user
    const encryptedName = encryptData("Alex Johnson");
    const encryptedWakeTime = encryptData("08:00");
    const encryptedSleepTime = encryptData("22:00");

    db.run(
      `INSERT INTO user_info (name, wake_time, sleep_time, is_setup_complete) 
       VALUES (?, ?, ?, ?)`,
      [encryptedName, encryptedWakeTime, encryptedSleepTime, 1],
      function (err) {
        if (err) {
          console.error("Error inserting user:", err);
          return;
        }
        const userId = this.lastID;
        console.log(`Inserted user with ID: ${userId}`);

        // Insert sample tasks
        const tasks = [
          {
            name: "Design new homepage layout",
            time: "09:00-11:00",
            due_date: new Date(Date.now() + 86400000)
              .toISOString()
              .split("T")[0], // Tomorrow
            priority: "High",
            completed: false,
          },
          {
            name: "Review team performance",
            time: "14:00-15:00",
            due_date: new Date(Date.now() + 3 * 86400000)
              .toISOString()
              .split("T")[0], // 3 days from now
            priority: "Medium",
            completed: false,
          },
          {
            name: "Update documentation",
            time: "16:00-17:00",
            due_date: new Date(Date.now() + 7 * 86400000)
              .toISOString()
              .split("T")[0], // 1 week from now
            priority: "Low",
            completed: true,
          },
          {
            name: "Implement API endpoints",
            time: "10:00-12:00",
            due_date: new Date(Date.now() + 86400000)
              .toISOString()
              .split("T")[0], // Tomorrow
            priority: "High",
            completed: false,
          },
          {
            name: "Write unit tests",
            time: "13:00-14:00",
            due_date: new Date(Date.now() + 2 * 86400000)
              .toISOString()
              .split("T")[0], // 2 days from now
            priority: "Medium",
            completed: true,
          },
        ];

        const stmt = db.prepare(
          `INSERT INTO user_tasks (user_id, task_name, task_time, due_date, priority, completed) 
           VALUES (?, ?, ?, ?, ?, ?)`
        );

        tasks.forEach((task) => {
          const encryptedName = encryptData(task.name);
          const encryptedTime = encryptData(task.time);
          const encryptedPriority = encryptData(task.priority);

          stmt.run(
            [
              userId,
              encryptedName,
              encryptedTime,
              task.due_date,
              encryptedPriority,
              task.completed ? 1 : 0,
            ],
            (err) => {
              if (err) console.error("Error inserting task:", err);
            }
          );
        });

        stmt.finalize(() => {
          console.log("Added sample tasks");
          db.close();
        });
      }
    );
  });
});
