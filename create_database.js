const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Database path
const DB_DIR = path.join(__dirname, "user_info");
const DB_PATH = path.join(DB_DIR, "user_data.db");

// Create directory if it doesn't exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
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
    db.run(`CREATE TABLE IF NOT EXISTS user_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
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

    // Insert sample user
    const name = "Alex Johnson";
    const startTime = "09:00";
    const endTime = "17:00";

    db.run(
      `INSERT INTO user_info (name, start_time, end_time, is_setup_complete) 
       VALUES (?, ?, ?, ?)`,
      [name, startTime, endTime, 1],
      function (err) {
        if (err) {
          console.error("Error inserting user:", err);
          return;
        }

        const userId = this.lastID;
        console.log(`Inserted user with ID: ${userId}`);

        // Helper to get ISO date string for N days from now
        const dateNDays = (n) =>
          new Date(Date.now() + n * 86400000).toISOString().split("T")[0];
        // Helper to get completed_at ISO string for N days ago
        const completedAtNDaysAgo = (n) =>
          new Date(Date.now() - n * 86400000).toISOString();

        // 15 sample tasks
        const tasks = [
          {
            name: "Design new homepage layout",
            time: "09:00-11:00",
            due_date: dateNDays(1),
            priority: "High",
            completed: false,
            completed_at: null,
          },
          {
            name: "Review team performance",
            time: "14:00-15:00",
            due_date: dateNDays(3),
            priority: "Medium",
            completed: false,
            completed_at: null,
          },
          {
            name: "Update documentation",
            time: "12:00-13:00",
            due_date: dateNDays(7),
            priority: "Low",
            completed: true,
            completed_at: completedAtNDaysAgo(1),
          },
          {
            name: "Implement API endpoints",
            time: "10:00-12:00",
            due_date: dateNDays(1),
            priority: "High",
            completed: false,
            completed_at: null,
          },
          {
            name: "Write unit tests",
            time: "13:00-14:00",
            due_date: dateNDays(2),
            priority: "Medium",
            completed: true,
            completed_at: completedAtNDaysAgo(2),
          },
          {
            name: "Prepare client presentation",
            time: "15:00-16:00",
            due_date: dateNDays(4),
            priority: "Low",
            completed: false,
            completed_at: null,
          },
          {
            name: "Fix login bug",
            time: "11:00-12:00",
            due_date: dateNDays(-1),
            priority: "High",
            completed: true,
            completed_at: completedAtNDaysAgo(1),
          },
          {
            name: "Update team calendar",
            time: "16:00-17:00",
            due_date: dateNDays(5),
            priority: "Medium",
            completed: false,
            completed_at: null,
          },
          {
            name: "Research competitors",
            time: "10:00-11:00",
            due_date: dateNDays(6),
            priority: "Low",
            completed: false,
            completed_at: null,
          },
          {
            name: "Organize files",
            time: "09:00-10:00",
            due_date: dateNDays(-2),
            priority: "Medium",
            completed: true,
            completed_at: completedAtNDaysAgo(2),
          },
          {
            name: "Plan marketing campaign",
            time: "14:00-15:30",
            due_date: dateNDays(8),
            priority: "High",
            completed: false,
            completed_at: null,
          },
          {
            name: "Conduct user interviews",
            time: "11:00-12:30",
            due_date: dateNDays(9),
            priority: "Medium",
            completed: false,
            completed_at: null,
          },
          {
            name: "Refactor codebase",
            time: "13:00-15:00",
            due_date: dateNDays(-3),
            priority: "High",
            completed: true,
            completed_at: completedAtNDaysAgo(3),
          },
          {
            name: "Update onboarding docs",
            time: "15:00-16:00",
            due_date: dateNDays(10),
            priority: "Low",
            completed: false,
            completed_at: null,
          },
          {
            name: "Team retrospective",
            time: "16:00-17:00",
            due_date: dateNDays(0),
            priority: "Medium",
            completed: false,
            completed_at: null,
          },
        ];

        const stmt = db.prepare(
          `INSERT INTO user_tasks (user_id, task_name, task_time, due_date, priority, completed, completed_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        );

        tasks.forEach((task) => {
          stmt.run(
            [
              userId,
              task.name,
              task.time,
              task.due_date,
              task.priority,
              task.completed ? 1 : 0,
              task.completed_at,
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
