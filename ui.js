$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  // +++ Added variables 
  // *** confirm IDs on html correct
  const $navbar = $("nav");
  const $navWelcome = $("#nav-welcome");
  const $mainNavLinks = $(".main-nav-links"); // +++ navbar links for authenticated users
  const $navUserProfile = $("#nav-user-profile");
  const $userProfile = $("#user-profile");
  const $favoritedStories = $("#favorited-articles");

  // global storyList and currentUser variables
  let storyList = null;
  let currentUser = null;
  
  await checkIfLoggedIn();

  // +++ navbar event listeners 
  $navbar.on("click", async function(e) {
    e.preventDefault(); // prevent reload
    // hideElements(); // call hideElements function
    console.log(e.target)
    if (e.target.id === "nav-all") {
      console.log(e.target.id)
      await generateStories();
      $allStoriesList.show();
    } else if (e.target.id === "nav-login") {
      // console.log(e.target.id)
      $loginForm.slideToggle(); // +++ use slideToggle animation jQuery method to show login/Account screen
      $createAccountForm.slideToggle();
    } else if (e.target.id === "nav-submit-story") {
      console.log(e.target.id)
      $submitForm.slideToggle(); // +++ slideToggle jQuery method to show story submission form
    } else if (e.target.id === "nav-favorites") {
      console.log(e.target.id)
      generateFavs(); // call generateFavs function to display user's favs
    } else if (e.target.id === "nav-my-stories") {
      console.log(e.target.id)
      generateMyStories();
    } else if (e.target.id === "nav-user-profile") {
      $userProfile.slideToggle();
    } else if (e.target.id === "logout-btn") {
      // console.log(e.target.id)
      localStorage.clear();
      location.reload();
    }
  })

  // Event listener for logging in - If successfully we will setup the user instance
  // +++ Slide down login form, displayed after 'login/create user' click
  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit
    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();
    // call the login static method to build a user instance
    // +++ Add simple error hanling to check for valid username/password
    try {
      const userInstance = await User.login(username, password);
      // set the global user to the user instance
      currentUser = userInstance;
      syncCurrentUserToLocalStorage(); // handle adding current user to local storage
      loginAndSubmitForm();
    } catch(err) {
      alert("You must enter valid user credentials");
    }
  });

  // Event listener for signing up.
  // If successfully we will setup a new user instance
  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh
    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();
    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage(); // handle adding current user to local storage
    loginAndSubmitForm();
  });

  // +++ Add listener for story submission form  
  $submitForm.on("submit", function(e) {
    e.preventDefault(); 
    // get story details and username of submitter 
    const author = $("#author").val();
    const title = $("#title").val();
    const url = $("#url").val();
    const userName = currentUser.username
    const hostName = getHostName(url)
    // +++ call buildNewStory function
    buildNewStory(author, title, url, userName, hostName);
    // hide and reset story form
    $submitForm.slideUp("slow");
    $submitForm.trigger("reset");
  })

  // +++ generate a new story
  async function buildNewStory(author, title, url, userName, hostName) {
    // +++ call addStory method from StoryList class, currentUser and object as arguments
    const newStory = await storyList.addStory(currentUser, {
      title, author, url, username
    });
    // +++ render HTML for added story
    const storyHTML = $(`
      <li id="${newStory.storyId}">
        <span class="star">
          <i class="far fa-star"></i>
        </span>
        <a class="article-link" href="${newStory.url}" target="a_blank">
          <strong>${newStory.title}</strong>
        </a>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-author">by ${newStory.author}</small>
        <small class="article-username">posted by ${newStory.username}</small>
      </li>
    `);
    $allStoriesList.prepend(storyHTML);
  }

  

 // +++ Incorporate navLogOut and navLogin handers into greater Navbar hander listener
  // ** Log Out Functionality **
  // $navLogOut.on("click", function() {
  //   localStorage.clear(); // empty out local storage
  //   location.reload(); // refresh the page, clearing memory
  // });

  /**
   * Event Handler for Clicking Login
   */

  // $navLogin.on("click", function() {
  //   // Show the Login and Create Account Forms
  //   $loginForm.slideToggle();
  //   $createAccountForm.slideToggle();
  //   $allStoriesList.toggle();
  // });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  // ** A rendering function to run to reset the forms and hide the login info **
  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();
    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");
    // show the stories
    $allStoriesList.show();
    // update the navigation bar
    showNavForLoggedInUser();
  }

  /* A rendering function to call the StoryList.getStories static method, 
     which will generate a storyListInstance. Then render it.
  */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */
  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile,
      $favoritedStories
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  // +++ show logged-in user navbar
  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $userProfile.hide(); // +++ hide the user profile info section
    $mainNavLinks.toggleClass("hidden"); // +++ toggleClass to display authenticated user nav links
    // $(".main-nav-links").toggleClass("hidden");
    $navWelcome.show();
  }

  /* simple function to pull the hostname from a URL */
  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */
  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
