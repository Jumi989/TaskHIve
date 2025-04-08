// /src/main.js
import './style.css';
import { Clerk } from '@clerk/clerk-js';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerk = new Clerk(clerkPubKey);

async function initializeClerkAndHandleAuth() {
    await clerk.load();

    const currentPath = window.location.pathname;
    const app = document.getElementById('app');

    function mountUserUI() {
        const user = clerk.user;
        const name = user.firstName || 'user';
        const greetingElement = document.getElementById('div');
        const userEmail = user.primaryEmailAddress.emailAddress;
        fetchAndDisplayTaskPads(userEmail); // Load user's task pads

        if (greetingElement) {
            greetingElement.innerHTML = `
                <h2 class="text-[#8D3E36] font-serif text-lg absolute top-16 left-6">Time to get stuff done. Let's fly through those tasks!</h2>
                <div class="flex items-center space-x-2 absolute top-24 left-2">
                    <h2 class="text-[#8D3E36] font-serif text-lg">${name}</h2>
                    <div id="user-button"></div>
                </div>
            `;

            const userButtonDiv = document.getElementById('user-button');
            if (userButtonDiv) {
                clerk.mountUserButton(userButtonDiv);
            } else {
                console.error('User button mount point not found!');
            }
        } else {
            console.error('Greeting div not found!');
        }
    }

    if (clerk.user) {
        if (!currentPath.endsWith('home.html')) {
            window.location.href = 'home.html';
        } else {
            mountUserUI();
        }
    } else {
        app.innerHTML = `<div id="sign-in"></div>`;
        const signInDiv = document.getElementById('sign-in');
        clerk.mountSignIn(signInDiv);

        clerk.onSignIn(() => {
            window.location.href = 'home.html';
        });
    }
}

initializeClerkAndHandleAuth();

async function fetchAndDisplayTaskPads(userEmail) {
    const response = await fetch(`http://localhost:3000/api/taskpads/${userEmail}`);
    const taskPads = await response.json();
    const taskPadsContainer = document.getElementById("taskPadsContainer");
    taskPadsContainer.innerHTML = ""; // Clear old pads

    taskPads.forEach(taskPadData => {
        const taskPadElement = createTaskPadElement(taskPadData, userEmail);
        taskPadsContainer.appendChild(taskPadElement);
        fetchAndDisplayTasks(userEmail, taskPadData.task_pad_id, taskPadElement.querySelector(".task-list"));
    });

    // Event listener for adding a new task pad
    document.getElementById("addTaskPadBtn").addEventListener("click", () => {
        createNewTaskPadUI(userEmail);
    });
}

async function createNewTaskPad(userEmail, title) {
    try {
        const response = await fetch('http://localhost:3000/api/taskpads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userEmail, title }),
        });

        if (response.ok) {
            const newTaskPad = await response.json();
            const taskPadsContainer = document.getElementById("taskPadsContainer");
            const newTaskPadElement = createTaskPadElement(newTaskPad, userEmail);
            taskPadsContainer.appendChild(newTaskPadElement);
            // No need to fetch tasks again here, the new pad is empty
        } else {
            console.error('Failed to create task pad');
        }
    } catch (error) {
        console.error('Error creating task pad:', error);
    }
}

function createTaskPadElement(taskPadData, userEmail) {
    const taskPad = document.createElement("div");
    taskPad.classList.add("bg-white", "p-4", "rounded-lg", "shadow-md", "relative");
    taskPad.dataset.taskPadId = taskPadData.task_pad_id;

    taskPad.innerHTML = `
        <input type="text" class="task-pad-title text-lg font-semibold w-full bg-transparent focus:outline-none" value="${taskPadData.title}" placeholder="Task List Name" />
        <div class="task-list mt-2"></div>
        <input type="text" class="new-task-input mt-2 w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Type a task and press Enter" />
        <p class="task-date text-gray-500 text-xs mt-2">${new Date(taskPadData.created_at).toLocaleDateString()}</p>
        <button class="delete-pad absolute top-2 right-2 text-red-500 text-lg">&times;</button>
    `;

    const taskList = taskPad.querySelector(".task-list");
    const newTaskInput = taskPad.querySelector(".new-task-input");
    const taskPadTitleInput = taskPad.querySelector(".task-pad-title");
    const deletePadButton = taskPad.querySelector(".delete-pad");

    // Event listener for updating task pad title
    taskPadTitleInput.addEventListener("blur", async () => {
        const newTitle = taskPadTitleInput.value.trim();
        if (newTitle !== taskPadData.title) {
            try {
                const response = await fetch(`http://localhost:3000/api/taskpads/${taskPadData.task_pad_id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ title: newTitle }),
                });
                if (!response.ok) {
                    console.error('Failed to update task pad title');
                    taskPadTitleInput.value = taskPadData.title;
                }
            } catch (error) {
                console.error('Error updating task pad title:', error);
                taskPadTitleInput.value = taskPadData.title;
            }
        }
    });
    taskPadTitleInput.addEventListener("keypress", async (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            taskPadTitleInput.blur();
        }
    });

    // Event listener for adding a new task
    newTaskInput.addEventListener("keypress", async function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            if (newTaskInput.value.trim() !== "") {
                await createNewTask(userEmail, newTaskInput.value.trim(), taskPadData.task_pad_id, taskList);
                newTaskInput.value = "";
            }
        }
    });

    // Event listener for deleting the task pad
    deletePadButton.addEventListener("click", async () => {
        if (confirm("Are you sure you want to delete this task list? All associated tasks will also be deleted.")) {
            try {
                const response = await fetch(`http://localhost:3000/api/taskpads/${taskPadData.task_pad_id}`, {
                    method: 'DELETE',
                });
                if (response.ok) {
                    taskPad.remove();
                } else {
                    console.error('Failed to delete task pad');
                }
            } catch (error) {
                console.error('Error deleting task pad:', error);
            }
        }
    });

    return taskPad;
}

async function fetchAndDisplayTasks(userEmail, taskPadId, taskListElement) {
    try {
        const response = await fetch(`http://localhost:3000/api/tasks/${userEmail}?taskPadId=${taskPadId}`);
        const tasks = await response.json();
        taskListElement.innerHTML = ""; // Clear existing tasks

        tasks.forEach(task => {
            const taskElement = createTaskElement(task.task_text, task.task_id, task.is_completed, taskPadId);
            taskListElement.appendChild(taskElement);
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

async function createNewTask(userEmail, taskText, taskPadId, taskListElement) {
    try {
        const response = await fetch('http://localhost:3000/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userEmail, taskText, taskPadId }),
        });

        if (response.ok) {
            const newTask = await response.json();
            const newTaskElement = createTaskElement(newTask.task_text, newTask.task_id, newTask.is_completed, taskPadId);
            taskListElement.appendChild(newTaskElement);
        } else {
            console.error('Failed to create task');
        }
    } catch (error) {
        console.error('Error creating task:', error);
    }
}

function createTaskElement(text = "", taskId, isCompleted = false, taskPadId) {
    const taskItem = document.createElement("div");
    taskItem.className = "flex items-center justify-between mt-2 group";
    taskItem.dataset.taskId = taskId;

    const taskTextDiv = document.createElement("div");
    taskTextDiv.contentEditable = true;
    taskTextDiv.innerText = text;
    taskTextDiv.className =
        "flex-1 px-2 py-1 rounded hover:bg-gray-100 focus:outline-none cursor-text";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "mr-2 cursor-pointer";
    checkbox.checked = isCompleted;

    if (isCompleted) {
        taskTextDiv.classList.add("line-through", "text-gray-400");
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.className =
        "text-red-500 opacity-0 group-hover:opacity-100 ml-2";

    checkbox.addEventListener("change", async () => {
        const updatedCompleted = checkbox.checked;
        try {
            await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    taskText: taskTextDiv.innerText,
                    is_completed: updatedCompleted,
                    taskPadId: taskPadId
                })
            });

            if (updatedCompleted) {
                taskTextDiv.classList.add("line-through", "text-gray-400");
            } else {
                taskTextDiv.classList.remove("line-through", "text-gray-400");
            }
        } catch (err) {
            console.error("Failed to update task status", err);
        }
    });

    taskTextDiv.addEventListener("blur", async () => {
        if (taskTextDiv.innerText !== text) {
            try {
                await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        taskText: taskTextDiv.innerText,
                        is_completed: checkbox.checked,
                        taskPadId: taskPadId
                    })
                });
                console.log("Task updated!");
            } catch (err) {
                console.error("Failed to update task text", err);
            }
        }
    });

    taskTextDiv.addEventListener("keypress", async (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            taskTextDiv.blur();
        }
    });

    deleteBtn.addEventListener("click", async () => {
        try {
            const response = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
                method: "DELETE",
            });

            if (response.status === 204) {
                taskItem.remove();
            } else {
                console.error("Failed to delete task from server");
            }
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    });

    taskItem.appendChild(checkbox);
    taskItem.appendChild(taskTextDiv);
    taskItem.appendChild(deleteBtn);

    return taskItem;
}

function createNewTaskPadUI(userEmail) {
    const taskPadsContainer = document.getElementById("taskPadsContainer");
    const newTaskPadDiv = document.createElement("div");
    newTaskPadDiv.classList.add("bg-white", "p-4", "rounded-lg", "shadow-md", "relative");

    newTaskPadDiv.innerHTML = `
        <input type="text" class="task-pad-title text-lg font-semibold w-full bg-transparent focus:outline-none" placeholder="Task List Name" />
        <div class="task-list mt-2"></div>
        <input type="text" class="new-task-input creating mt-2 w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Type a task and press Enter" />
        <p class="task-date text-gray-500 text-xs mt-2">${new Date().toLocaleDateString()}</p>
        <button class="delete-pad absolute top-2 right-2 text-red-500 text-lg">&times;</button>
        <button class="save-pad absolute bottom-2 right-2 bg-green-500 text-white rounded px-2 py-1 text-sm">Save</button>
        <button class="cancel-pad absolute bottom-2 left-2 bg-gray-300 text-gray-700 rounded px-2 py-1 text-sm">Cancel</button>
    `;

    taskPadsContainer.appendChild(newTaskPadDiv);

    const titleInput = newTaskPadDiv.querySelector(".task-pad-title");
    const saveButton = newTaskPadDiv.querySelector(".save-pad");
    const cancelButton = newTaskPadDiv.querySelector(".cancel-pad");
    const newTaskInput = newTaskPadDiv.querySelector(".new-task-input.creating"); // Target only the creating input
    const taskList = newTaskPadDiv.querySelector(".task-list");
    const deletePadButton = newTaskPadDiv.querySelector(".delete-pad");

    // Save new pad
    saveButton.addEventListener("click", async () => {
        const title = titleInput.value.trim();
        if (title) {
            await createNewTaskPad(userEmail, title);
            newTaskPadDiv.remove(); // Remove the temporary UI
        } else {
            alert("Please enter a title for the task list.");
        }
    });

    // Cancel new pad creation
    cancelButton.addEventListener("click", () => {
        newTaskPadDiv.remove();
    });

    // Add new task to the creating pad (temporary - will be saved with the pad)
    newTaskInput.addEventListener("keypress", async function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            if (newTaskInput.value.trim() !== "") {
                const tempTaskElement = createTaskElement(newTaskInput.value.trim(), null, false, null); // No ID yet
                taskList.appendChild(tempTaskElement);
                newTaskInput.value = "";
            }
        }
    });

    // Delete the temporary pad
    deletePadButton.addEventListener("click", () => {
        newTaskPadDiv.remove();
    });
} 
