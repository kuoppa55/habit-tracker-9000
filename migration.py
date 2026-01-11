import sqlite3

conn = sqlite3.connect('instance/habits.db')
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE daily_logs ADD COLUMN historical_target REAL")
except sqlite3.OperationalError:
    print("Column already exists")

cursor.execute('''
    UPDATE daily_logs
    SET historical_target = (SELECT target FROM habits WHERE habits.id = daily_logs.habit_id)
    WHERE historical_target IS NULL
''')

conn.commit()
conn.close()
print("Migration completed successfully.")