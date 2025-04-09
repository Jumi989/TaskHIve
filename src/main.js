// File: src/main.js

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
  
    if (greetingElement) {
      greetingElement.innerHTML = `
        <h2 class="text-[#8D3E36] font-serif text-lg absolute top-16 left-6">
          Time to get stuff done. Let's fly through those tasks!
        </h2>
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
