let clerkReady = false;
let clerkInstance = null;
let userEmailCache = null;

function waitForClerkReady() {
    return new Promise((resolve) => {
        window.addEventListener("clerk-ready", () => {
            clerkReady = true;
            clerkInstance = window.Clerk; // Store globally available Clerk instance
            resolve();
        });
    });
}

async function initHome() {
    await waitForClerkReady();
    console.log("Clerk is ready in home.js");

    clerkInstance?.onUser(async (user) => {
        console.log('clerk.onUser fired'); // Check if this fires
        console.log('clerkInstance in onUser:', clerkInstance); // Check clerkInstance value
        if (user) {
            userEmailCache = user.emailAddresses[0].emailAddress;
            const addTaskPadButton = document.getElementById("addTaskPad");
            if (addTaskPadButton) {
                addTaskPadButton.disabled = false;
                addTaskPadButton.addEventListener("click", handleAddTaskPad);
                console.log('Add task button enabled inside onUser'); // Check if button is enabled
            } else {
                console.error('addTaskPadButton not found in onUser!');
            }
            fetchTasks();
        } else {
            // User is signed out, handle accordingly (e.g., redirect)
            console.log("User signed out");
            // Optionally: window.location.href = '/sign-in';
        }
    });
}

(async function() {
    await initHome();
})();

async function getLoggedInUserEmail() {
    if (userEmailCache) {
        return userEmailCache;
    } else {
        console.warn("Clerk user not yet available.");
        return null;
    }
}

async function fetchTasks() {
    const userEmail = await getLoggedInUserEmail();
    if (!userEmail) return;

    try {
        const response = await fetch(`/api/tasks/${userEmail}`);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

        const tasks = await response.json();
        const taskPadsContainer = document.getElementById("taskPadsContainer");
        taskPadsContainer.innerHTML = "";

        tasks.forEach(task => createTaskPad(task, taskPadsContainer, userEmail));
    } catch (err) {
        console.error("Error fetching tasks:", err);
    }
}

function createTaskPad(task, container, userEmail) {
    const taskPad = document.createElement("div");
    taskPad.className = "bg-white p-4 rounded-lg shadow-md relative";
    taskPad.innerHTML = `
        <input type="text" class="task-title text-lg font-semibold w-full bg-transparent focus:outline-none" placeholder="Task List Name" value="${task.title || ''}" />
        <div class="task-list mt-2"></div>
        <input type="text" class="new-task-input mt-2 w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Type a task and press Enter" />
        <p class="task-date text-gray-500 text-xs mt-2">${new Date(task.created_at).toDateString()}</p>
        <button class="delete-pad absolute top-2 right-2 text-red-500 text-lg">&times;</button>
    `;

    const taskList = taskPad.querySelector(".task-list");
    const taskElement = createTaskElement(task.task_text, task.task_id, task.is_completed);
    taskList.appendChild(taskElement);

    const newTaskInput = taskPad.querySelector(".new-task-input");
    newTaskInput.addEventListener("keypress", async (e) => {
        if (e.key === "Enter" && newTaskInput.value.trim() !== "") {
            await saveNewTask(newTaskInput.value.trim(), userEmail, taskList);
            newTaskInput.value = "";
        }
    });

    taskPad.querySelector(".delete-pad").addEventListener("click", () => {
        taskPad.remove();
        // Optional: delete from database here
    });

    container.appendChild(taskPad);
}

async function handleAddTaskPad() {
    const userEmail = await getLoggedInUserEmail();
    if (!userEmail) {
        console.warn("User not signed in");
        return;
    }

    const container = document.getElementById("taskPadsContainer");

    const taskPad = document.createElement("div");
    taskPad.className = "bg-white p-4 rounded-lg shadow-md relative";
    taskPad.innerHTML = `
        <input type="text" class="task-title text-lg font-semibold w-full bg-transparent focus:outline-none" placeholder="Task List Name" />
        <div class="task-list mt-2"></div>
        <input type="text" class="new-task-input mt-2 w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Type a task and press Enter" />
        <p class="task-date text-gray-500 text-xs mt-2">${new Date().toDateString()}</p>
        <button class="delete-pad absolute top-2 right-2 text-red-500 text-lg">&times;</button>
    `;

    const taskList = taskPad.querySelector(".task-list");
    const newTaskInput = taskPad.querySelector(".new-task-input");

    newTaskInput.addEventListener("keypress", async function (e) {
        if (e.key === "Enter" && newTaskInput.value.trim() !== "") {
            await saveNewTask(newTaskInput.value.trim(), userEmail, taskList);
            newTaskInput.value = "";
        }
    });

    taskPad.querySelector(".delete-pad").addEventListener("click", () => {
        taskPad.remove();
        // Optional: delete from database here
    });

    container.appendChild(taskPad);
}

async function saveNewTask(text, userEmail, taskList) {
    if (!text || !userEmail) return;

    try {
        const response = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userEmail, text }),
        });
        if (!response.ok) throw new Error(`Save failed: ${response.status}`);

        const newTask = await response.json();
        const taskElement = createTaskElement(newTask.task_text, newTask.task_id, newTask.is_completed);
        taskList.appendChild(taskElement);
    } catch (err) {
        console.error("Error saving task:", err);
    }
}

function createTaskElement(text = "", taskId = null, isCompleted = false) {
    const taskItem = document.createElement("div");
    taskItem.className = "flex items-center justify-between mt-2 group";
    taskItem.dataset.taskId = taskId;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "mr-2 cursor-pointer";
    checkbox.checked = isCompleted;

    const taskText = document.createElement("div");
    taskText.contentEditable = true;
    taskText.innerText = text;
    taskText.className = "flex-1 px-2 py-1 rounded hover:bg-gray-100 focus:outline-none cursor-text";
    if (isCompleted) {
        taskText.classList.add("line-through", "text-gray-400");
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.className = "text-red-500 opacity-0 group-hover:opacity-100 ml-2";

    checkbox.addEventListener("change", async () => {
        taskText.classList.toggle("line-through", checkbox.checked);
        taskText.classList.toggle("text-gray-400", checkbox.checked);
        const userEmail = await getLoggedInUserEmail();
        if (taskId && userEmail) {
            try {
                await fetch(`/api/tasks/${taskId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ is_completed: checkbox.checked }),
                });
            } catch (err) {
                console.error("Error updating task status:", err);
            }
        }
    });

    deleteBtn.addEventListener("click", async () => {
        const userEmail = await getLoggedInUserEmail();
        if (taskId && userEmail) {
            try {
                const res = await fetch(`/api/tasks/${taskId}`, {
                    method: "DELETE",
                });
                if (res.ok) {
                    taskItem.remove();
                } else {
                    console.error("Failed to delete task");
                }
            } catch (err) {
                console.error("Error deleting task:", err);
            }
        } else {
            taskItem.remove(); // fallback if not saved yet
        }
    });

    taskItem.appendChild(checkbox);
    taskItem.appendChild(taskText);
    taskItem.appendChild(deleteBtn);

    return taskItem;
} 