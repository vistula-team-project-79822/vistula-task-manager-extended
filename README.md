# Vistula Task Manager Extended

Task Manager with categories, built with HTML, CSS and JavaScript. Data is stored in Supabase (PostgreSQL) and accessed through the Supabase REST API. Hosted on GitHub Pages.

Course: Team Project – IT, Practical Assignment 2 (advanced)

**Student ID:** 79822

## Links

- Application: https://vistula-team-project-79822.github.io/vistula-task-manager-extended/
- Statistics page: https://vistula-team-project-79822.github.io/vistula-task-manager-extended/statistics.html
- Application info: https://vistula-team-project-79822.github.io/vistula-task-manager-extended/info.json
- Repository: https://github.com/vistula-team-project-79822/vistula-task-manager-extended

## Pull Requests

- Pull Request created by my partner in this repository (statistics page): _link will be added_
- Pull Request I created in my partner's repository (statistics page): _link will be added_

## Database structure

The SQL used to create everything is in [`database.sql`](database.sql).

**categories**

| Column | Type | Requirements |
|--------|------|--------------|
| id | BIGINT | Primary key, generated automatically |
| name | TEXT | Required |

**tasks**

| Column | Type | Requirements |
|--------|------|--------------|
| id | BIGINT | Primary key, generated automatically |
| title | TEXT | Required |
| description | TEXT | Optional |
| completed | BOOLEAN | Default `false` |
| category_id | BIGINT | Foreign key referencing `categories.id` |

## Relationship between tasks and categories

It is a one-to-many relationship. One category can contain many tasks, and each task points to one category through the foreign key `tasks.category_id → categories.id`. The foreign key guarantees that a task can only reference a category that exists. If a category is deleted, `category_id` of its tasks is set to `NULL` (`ON DELETE SET NULL`). Because of the foreign key, Supabase can return the related category together with a task: `/tasks?select=*,categories(name)`.

Row Level Security is enabled on both tables. The demonstration database allows the public `anon` role to read and write; only the public (publishable) key is used. No secret keys, service role keys or database passwords are in this repository.

## Example REST API requests

Base URL: `https://PROJECT_REF.supabase.co/rest/v1` (header `apikey: PUBLISHABLE_KEY`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories?select=*` | Retrieve all categories |
| POST | `/categories` | Create a category (`{"name": "Hobby"}`) |
| GET | `/tasks?select=*,categories(name)` | Retrieve tasks together with category names |
| GET | `/tasks?category_id=eq.1` | Retrieve tasks from a selected category |
| GET | `/tasks?completed=eq.false` | Retrieve incomplete tasks |
| PATCH | `/tasks?id=eq.1` | Update a task, including its category (`{"category_id": 2}`) |
| POST | `/tasks` | Create a task |
| DELETE | `/tasks?id=eq.1` | Delete a task |

Filters can be combined, for example incomplete tasks of category 1: `/tasks?select=*,categories(name)&category_id=eq.1&completed=eq.false`.

## Files

- `index.html`, `app.js` – the application
- `statistics.html` – statistics page (written by my partner through a Pull Request)
- `config.json` – public Supabase configuration
- `info.json` – application information
- `database.sql` – database structure and example data
