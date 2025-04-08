// /src/main.js
import './style.css'
import { Clerk } from '@clerk/clerk-js'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const clerk = new Clerk(clerkPubKey)

async function initializeClerkAndHandleAuth() {
  await clerk.load()

  const currentPath = window.location.pathname
  const app = document.getElementById('app')

  function mountUserUI() {
    const user = clerk.user;
    const name = user.firstName || 'user';
    const greetingElement = document.getElementById('div');
    const userEmail = user.primaryEmailAddress.emailAddress;
    fetchAndDisplayTasks(userEmail); // Load user's tasks
    
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
async function fetchAndDisplayTasks(userEmail) {
  const response = await fetch(`http://localhost:3000/api/tasks/${userEmail}`);
  const tasks = await response.json();
  const taskPadsContainer = document.getElementById("taskPadsContainer");
  taskPadsContainer.innerHTML = ""; // Clear old

  const taskPad = document.createElement("div");
  taskPad.className = "bg-white p-4 rounded-lg shadow-md";
  taskPad.innerHTML = `
    <h3 class="text-lg font-semibold mb-2">Your Tasks</h3>
    <div class="task-list"></div>
    <input class="new-task-input mt-2 w-full border px-2 py-1 rounded" placeholder="New task..." />
  `;
  const taskList = taskPad.querySelector(".task-list");
  const input = taskPad.querySelector(".new-task-input");

  tasks.forEach(task => {
    const taskElement = createTaskElement(task.task_text, task.task_id, task.is_completed);
    taskList.appendChild(taskElement);
  });

  // Add new task
  input.addEventListener("keypress", async (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      const response = await fetch(`http://localhost:3000/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          title: input.value,
          taskText: input.value
        })
      });
      const newTask = await response.json();
      taskList.appendChild(createTaskElement(newTask.task_text, newTask.task_id));
      input.value = "";
    }
  });

  taskPadsContainer.appendChild(taskPad);
}
