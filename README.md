# Calendly API Integration (Node.js)

This project is a custom Node.js integration with the **Calendly v2 API**. It allows you to programmatically check availability, fetch form questions (including dynamic fields like Dropdowns, Checkboxes, and Radio buttons), and generate pre-filled Single-Use Scheduling Links.

## 🚀 Features

* **Check Availability:** specific dates and times.
* **Dynamic Form Parsing:** Automatically detects custom questions (Radio, Checkbox, Text, etc.).
* **Smart Link Generation:** Creates single-use booking links with data pre-filled.
* **Availability Protection:** Prevents booking on invalid dates/times before generating a link.

---

## 🛠️ Prerequisites

* **Node.js** (v14 or higher)
* **Calendly Professional/Teams Account** (Required for API access)
* A valid **Calendly Personal Access Token**

---

## ⚙️ Installation & Setup

1.  **Clone or Download** this repository.
2.  **Install Dependencies**:
    ```bash
    npm install axios dotenv
    ```
3.  **Configure Environment Variables**:
    Create a file named `.env` in the root directory and add your credentials:
    ```env
    # Your Calendly Personal Access Token
    CALENDLY_TOKEN=your_long_token_here

    # The specific Event URI you want to book
    # (Use the 'find_correct_uri.js' script to find this)
    CALENDLY_EVENT_URI=[https://api.calendly.com/event_types/YOUR_EVENT_UUID](https://api.calendly.com/event_types/YOUR_EVENT_UUID)
    ```

---

## 📂 Project Structure

```text
.
├── src
│   ├── config
│   │   └── client.js        # Axios instance & Authentication
│   └── services
│       └── calendly.js      # Main Logic (Availability, Questions, Links)
├── find_correct_uri.js      # Utility: Finds your Event URI
├── test_script.js           # Test: Runs full logic check (Availability + Questions)
├── getFreshLink.js          # Test: Generates a real booking link
└── .env                     # Your API Keys (Not committed to git)