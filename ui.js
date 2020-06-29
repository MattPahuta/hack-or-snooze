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
  // +++ Added global variables:
  // *** confirm IDs on html correct
  const $navbar = $("nav");
  const $navWelcome = $("#nav-welcome");
  const $mainNavLinks = $(".main-nav-links"); // +++ navbar links for authenticated users
  const $articlesContainer = $(".articles-container"); // +++ main container for articles
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
      $allStoriesList.hide();
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
  // +++ form displayed after 'login/create user' click
  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit
    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();
    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance; 
    syncCurrentUserToLocalStorage(); // handle adding current user to local storage
    loginAndSubmitForm();
  });

  // Event listener for signing up.
  // If successfully we will setup a new user instance
  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh
    let name = $("#create-account-name").val(); // detect required value
    let username = $("#create-account-username").val(); // detect required value
    let password = $("#create-account-password").val(); // detect required value
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
    const userName = currentUser.username;
    const hostName = getHostName(url);
    // +++ call buildNewStory function
    buildNewStory(author, title, url, userName, hostName);
    // hide and reset story form
    $submitForm.slideUp("slow");
    $submitForm.trigger("reset");
  })

  // +++ generate a new story
  async function buildNewStory(author, title, url, username, hostName) {
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

  // +++ Listener to favorite/un-favorite stories 
  $articlesContainer.on("click", ".star", async function (evt) {
  // $(".articles-container").on("click", ".star", async function (evt) {
    if (currentUser) {
      const favTarget = $(evt.target);
      const favLi = favTarget.closest("li");
      const storyId = favLi.attr("id");
      if (favTarget.hasClass("fas")) {
        await currentUser.removeFavorites(storyId); // await removeFavorites method
        favTarget.closest("i").toggleClass("fas far");
      } else {
        await currentUser.addFavorites(storyId); // await addFavorites method
        favTarget.closest("i").toggleClass("fas far")
      }
    }
  });
  

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

  // +++ New Function - verifyStory(story) - error handling to prompt page refresh?

  // Function to render HTML for an individual Story instance
  function generateStoryHTML(story, isOwnStory) { // +++ Addd isOwnStory parameter to enable trash can icon user's stories
    let hostName = getHostName(story.url);
    let starType = isFavorite(story) ? "fas" : "far"; // +++ use ternary operator to determine version of fav icon
    const trashCanIcon = isOwnStory ? `<span class="trash-con"><i class="fas fa-trash-alt"></i></span>` : ""; // +++ ternary to assoc trash icon with isOwnStory
    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      ${trashCanIcon}
        <span class="star">
          <i class="${starType} fa-star"></i>
        </span>
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

  // rendering function to build user favs list
  // +++ function from solution code
  function generateFavs() {
    $favoritedStories.empty();
    if (currentUser.favorites.length === 0) { // display message if currentUser's favorites array empty
      $favoritedStories.append("<h5>No favorites added!</h5>");
    } else { // else, loop over currentUser's favs array, call generateStoryHTML for each story fav item
      for (let story of currentUser.favorites) {
        let favoriteHTML = generateStoryHTML(story, false, true);
        $favoritedStories.append(favoriteHTML);
      }
    }
    $favoritedStories.show();
  }

  // rendering function to display all user's posted stories
  // +++ function from solution code
  function generateMyStories() {
    $ownStories.empty();
    if (currentUser.ownStories.length === 0) { // if user's ownStories array is empty, display message
      $ownStories.append("<h5>No stories added by user yet!</h5>");
    } else { // else, loop over ownStories array, call generateStoryHTML, append to page
      for (let story of currentUser.ownStories) {
        let ownStoryHTML = generateStoryHTML(story, true);
        $ownStories.append(ownStoryHTML);
      }
    }
    $ownStories.show();
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
      $favoritedStories // +++ attend to this for authenticated users, new function?
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
    $allStoriesList.show(); // maybe
  }

  // +++ function to account for user favorites 
  // +++ from solution code
  function isFavorite(story) {
    let favStoryIds = new Set();
    if (currentUser) {
      favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));
    }
    return favStoryIds.has(story.storyId);
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
