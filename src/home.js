function createTaskElement(text = "") {
    const taskItem = document.createElement("div");
    taskItem.className = "flex items-center justify-between mt-2 group";

    const taskText = document.createElement("div");
    taskText.contentEditable = true;
    taskText.innerText = text;
    taskText.className = "flex-1 px-2 py-1 rounded hover:bg-gray-100 focus:outline-none cursor-text";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "mr-2 cursor-pointer";

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.className = "text-red-500 opacity-0 group-hover:opacity-100 ml-2";

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        taskText.classList.add("line-through", "text-gray-400");
      } else {
        taskText.classList.remove("line-through", "text-gray-400");
      }
    });

    deleteBtn.addEventListener("click", () => {
      taskItem.remove();
    });

    taskItem.appendChild(checkbox);
    taskItem.appendChild(taskText);
    taskItem.appendChild(deleteBtn);

    return taskItem;
  }

  document.getElementById("addTaskPad").addEventListener("click", function () {
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

    newTaskInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter" && newTaskInput.value.trim() !== "") {
        const taskElement = createTaskElement(newTaskInput.value.trim());
        taskList.appendChild(taskElement);
        newTaskInput.value = "";
      }
    });

    // Delete task pad
    taskPad.querySelector(".delete-pad").addEventListener("click", function () {
      taskPad.remove();
    });

    taskPadsContainer.appendChild(taskPad);
  });

  document.getElementById("addTaskPad").addEventListener("click", function () {
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

    newTaskInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter" && newTaskInput.value.trim() !== "") {
        const taskElement = createTaskElement(newTaskInput.value.trim());
        taskList.appendChild(taskElement);
        newTaskInput.value = "";
      }
    });

    // Delete task pad
    taskPad.querySelector(".delete-pad").addEventListener("click", function () {
      taskPad.remove();
    });

    taskPadsContainer.appendChild(taskPad);
  });