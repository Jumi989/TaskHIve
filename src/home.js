let clerkReady = false; // Flag to track Clerk's readiness
const addTaskPadButton = document.getElementById("addTaskPad");

async function getLoggedInUserEmail() {
    if (window.Clerk && window.Clerk.user && clerkReady) { // Check the flag
        return window.Clerk.user.emailAddresses[0].emailAddress;
    } else {
        console.warn("Clerk user not yet available in getLoggedInUserEmail.");
        return null;
    }
}

async function fetchTasks() {
    if (!clerkReady) {
        console.log("Clerk not ready yet, delaying fetchTasks.");
        return;
    }
    const userEmail = await getLoggedInUserEmail();
    if (userEmail) {
        try {
            const response = await fetch(`/api/tasks/${userEmail}`);
            if (!response.ok) {
                console.error('Error fetching tasks:', response.status);
                return;
            }
            const tasks = await response.json();
            const taskPadsContainer = document.getElementById("taskPadsContainer");
            taskPadsContainer.innerHTML = ''; // Clear existing tasks
            tasks.forEach(task => {
                const taskPad = document.createElement('div');
                taskPad.classList.add("bg-white", "p-4", "rounded-lg", "shadow-md", "relative");
                taskPad.innerHTML = `
                    <input type="text" class="task-title text-lg font-semibold w-full bg-transparent focus:outline-none" placeholder="Task List Name" value="${task.title || ''}" />
                    <div class="task-list mt-2"></div>
                    <input type="text" class="new-task-input mt-2 w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" placeholder="Type a task and press Enter" />
                    <p class="task-date text-gray-500 text-xs mt-2">${new Date(task.created_at).toDateString()}</p>
                    <button class="delete-pad absolute top-2 right-2 text-red-500 text-lg">&times;</button>
                `;
                const taskList = taskPad.querySelector('.task-list');
                const taskItemElement = createTaskElement(task.task_text, task.task_id, task.is_completed);
                taskList.appendChild(taskItemElement);
                taskPadsContainer.appendChild(taskPad);

                // Attach event listener for adding new tasks within this pad
                const newTaskInput = taskPad.querySelector(".new-task-input");
                newTaskInput.addEventListener("keypress", async function (e) {
                    if (e.key === "Enter" && newTaskInput.value.trim() !== "") {
                        await saveNewTask(newTaskInput.value.trim(), userEmail, taskList);
                        newTaskInput.value = "";
                    }
                });

                // Attach event listener for deleting the pad
                taskPad.querySelector(".delete-pad").addEventListener("click", function () {
                    // Implement logic to delete the entire task pad and its tasks from the database
                    taskPad.remove();
                });
            });
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }
}

document.addEventListener('clerk-ready', () => {
    console.log('Clerk is ready in home.js.');
    clerkReady = true;
    if (addTaskPadButton) {
        addTaskPadButton.disabled = false; // Enable the button
    } else{
        console.log('addTaskPadButton:', addTaskPadButton);
    }
    fetchTasks();
});

if (addTaskPadButton) {
    addTaskPadButton.addEventListener("click", async function () {
        if (!clerkReady) {
            console.warn("Clerk not ready, cannot add task pad yet.");
            return;
        }

        const userEmail = await getLoggedInUserEmail();
        if (!userEmail) {
            console.warn("User email not available when adding task pad.");
            return;
        }

        const taskPadsContainer = document.getElementById("taskPadsContainer");
        const taskPad = document.createElement("div");
        taskPad.classList.add("bg-white", "p-4", "rounded-lg", "shadow-md", "relative");
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

        taskPad.querySelector(".delete-pad").addEventListener("click", function () {
            // Implement logic to delete the entire task pad and its tasks from the database
            taskPad.remove();
        });

        taskPadsContainer.appendChild(taskPad);
    });
}

async function saveNewTask(text, userEmail, taskList) {
    if (!clerkReady || !userEmail || !text) {
        console.warn("Clerk not ready or user email/task text missing, cannot save task.");
        return;
    }

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userEmail: userEmail, text: text }),
        });
        if (!response.ok) {
            console.error('Error saving task:', response.status);
            return;
        }
        const newTask = await response.json();
        const taskElement = createTaskElement(newTask.task_text, newTask.task_id, newTask.is_completed);
        taskList.appendChild(taskElement);
    } catch (error) {
        console.error('Error saving task:', error);
    }
}

function createTaskElement(text = "", taskId = null, isCompleted = false) {
    const taskItem = document.createElement("div");
    taskItem.className = "flex items-center justify-between mt-2 group";
    taskItem.dataset.taskId = taskId;

    const taskText = document.createElement("div");
    taskText.contentEditable = true;
    taskText.innerText = text;
    taskText.className = "flex-1 px-2 py-1 rounded hover:bg-gray-100 focus:outline-none cursor-text";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "mr-2 cursor-pointer";
    checkbox.checked = isCompleted;
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
                const response = await fetch(`/api/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ is_completed: checkbox.checked }),
                });
                if (!response.ok) {
                    console.error('Error updating task status:', response.status);
                }
            } catch (error) {
                console.error('Error updating task status:', error);
            }
        }
    });

    deleteBtn.addEventListener("click", async () => {
        const taskIdToDelete = taskItem.dataset.taskId;
        const userEmail = await getLoggedInUserEmail();
        if (taskIdToDelete && userEmail) {
            try {
                const response = await fetch(`/api/tasks/${taskIdToDelete}`, {
                    method: 'DELETE',
                });
                if (response.ok) {
                    taskItem.remove();
                } else {
                    console.error('Error deleting task:', response.status);
                }
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        } else {
            taskItem.remove();
        }
    });

    taskItem.appendChild(checkbox);
    taskItem.appendChild(taskText);
    taskItem.appendChild(deleteBtn);

    return taskItem;
}