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

        // Insert sample tasks
        const tasks = [
          {
            name: "Design new homepage layout",
            time: "09:00-11:00",
            due_date: new Date(Date.now() + 1 * 86400000)
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
              .split("T")[0], // 3 days
            priority: "Medium",
            completed: false,
          },
          {
            name: "Update documentation",
            time: "12:00-13:00",
            due_date: new Date(Date.now() + 7 * 86400000)
              .toISOString()
              .split("T")[0], // 1 week
            priority: "Low",
            completed: true,
          },
          {
            name: "Implement API endpoints",
            time: "10:00-12:00",
            due_date: new Date(Date.now() + 1 * 86400000)
              .toISOString()
              .split("T")[0],
            priority: "High",
            completed: false,
          },
          {
            name: "Write unit tests",
            time: "13:00-14:00",
            due_date: new Date(Date.now() + 2 * 86400000)
              .toISOString()
              .split("T")[0],
            priority: "Medium",
            completed: true,
          },
        ];

        const stmt = db.prepare(
          `INSERT INTO user_tasks (user_id, task_name, task_time, due_date, priority, completed) 
           VALUES (?, ?, ?, ?, ?, ?)`
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
