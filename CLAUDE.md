# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Run the application (development server on port 5000)
python app.py

# Initialize the database (first-time setup)
flask init-db
```

## Architecture Overview

This is a Flask-based habit tracking application with SQLite persistence and server-side rendered templates.

### Habit Types

Three distinct habit types, each with different tracking and visualization logic:

1. **Binary** (`type='binary'`) - Simple done/not done tracking
2. **Progressive** (`type='progressive'`) - Track cumulative progress toward a daily target (e.g., "5 miles", "8 glasses")
3. **Vice** (`type='vice'`) - Avoidance tracking; logs represent temptations resisted, not completions

### Historical Target Snapshots

The `daily_logs.historical_target` column stores the habit's target value at the time of logging. This allows users to change targets without breaking past streak calculations. Always use `historical_target` when evaluating past completions.

### Key Backend Functions (app.py)

- `calculate_habit_stats(habit, ref_date)` - Computes streak, completion status, fill percentage, and shield material for vice habits
- `get_habit_history(habit_id, current_target, ref_date)` - Returns 5-day rolling history for the dashboard chain visualization

### Frontend Patterns

- AJAX form submissions return JSON with updated stats; DOM updates without page reload
- URL parameters (`?event=completed&event_id=123`) trigger animations (confetti, shield deflection)
- Scroll position preserved via localStorage for seamless navigation

### Shield Material Progression (Vice habits)

Streak-based visual upgrades: Wood (0-13) → Iron (14-29) → Gold (30-59) → Energy (60+)

### Database Schema

```sql
habits: id, name, type, target, unit, color
daily_logs: id, habit_id, date, value, historical_target
```
