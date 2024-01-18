import "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js";
import User, { Post } from "./user.js";


export default class App {
  constructor() {
    /* Store the currently logged-in user. */
    this._user = null;
    this._postForm = document.querySelector("#postForm");
    this._loginForm = document.querySelector("#loginForm");
    this._loadProfile = this._loadProfile.bind(this);
    this._load = this._load.bind(this);
    this._loginForm.login.addEventListener("click", this._load);
    this._nameForm = document.querySelector("#nameForm");
    this._updateName = this._updateName.bind(this);
    this._nameForm.submit.addEventListener("click", this._updateName);
    this._avatarForm = document.querySelector("#avatarForm");
    this._updateAvatar = this._updateAvatar.bind(this);
    this._avatarForm.submit.addEventListener("click", this._updateAvatar);
    this._post = this._post.bind(this);
    document.querySelector("#postButton").addEventListener("click", this._post);
    this._loadMoods = this._loadMoods.bind(this);
    this._handleMoods = this._handleMoods.bind(this);
    this._moods = document.querySelectorAll(".mood");
    this._mood;
  }

  /*** Event handlers ***/

  /* Upon clickling login, set this._user and then load profile */
  async _load(event) {
    event.preventDefault();
    let userID = this._loginForm.userid.value;
    this._user = await User.loadOrCreate(userID);
    this._loadMoods();
    this._loadProfile();
  }

  /* Handles the user clicking a mood */
  _handleMoods(event) {
    this._removeSelected();
    event.currentTarget.classList.add("selected");
  }

  /* Update the user's name */
  async _updateName(event) {
    event.preventDefault();
    this._user.name = this._nameForm.name.value;
    let user = new User(this._user);
    user.save();
    this._user = await User.loadOrCreate(this._user.id);
    this._loadProfile();
  }

  /* Update the user's avatar */
  async _updateAvatar(event) {
    event.preventDefault();
    this._user.avatarURL = this._avatarForm.avatar.value;
    let user = new User(this._user);
    user.save();
    this._user = await User.loadOrCreate(this._user.id);
    this._loadProfile();
  }

  /* Create a new post */
  async _post(event) {
    event.preventDefault();
    let user = new User(this._user);
    let newPost = document.querySelector("#newPost");
    let mood = document.querySelector("#moods").querySelector(".selected");
    mood = (mood === null) ? null : mood.getAttribute("src");
    let text = newPost.value;
    newPost.value = (mood === null) ? newPost.value : "";
    await user.makePost(text, mood);
    this._user = await User.loadOrCreate(this._user.id);
    this._removeSelected();
    this._loadProfile();
  }

  /*** Helper methods ***/

  /* Adds event listeners to the mood selectors */
  _loadMoods() {
    for (let mood of this._moods) {
      mood.addEventListener("click", this._handleMoods);
    }
  }

  /* Helper function to remove the selected class */
  _removeSelected() {
    for (let mood of this._moods) {
      mood.classList.remove("selected");
    }
  }

  /* Add the given Post object to the feed. */
  _displayPost(post) {
    /* Make sure we receive a Post object. */
    if (!(post instanceof Post)) throw new Error("displayPost wasn't passed a Post object");

    let elem = document.querySelector("#templatePost").cloneNode(true);
    elem.id = "";

    let mood = elem.querySelector(".mood");
    mood.src = post.mood;

    elem.querySelector(".time").textContent = post.time.toLocaleString();
    elem.querySelector(".text").textContent = post.text;

    document.querySelector("#feed").append(elem);
  }

  /* Load (or reload) a user's profile. Assumes that this._user has been set to a User instance. */
  async _loadProfile() {
    document.querySelector("#welcome").classList.add("hidden");
    document.querySelector("#main").classList.remove("hidden");
    document.querySelector("header").classList.remove("hidden");
    document.querySelector("#idContainer").textContent = this._user.id;
    /* Reset the feed. */
    document.querySelector("#feed").textContent = "";

    /* Update the avatar, name, and user ID in the new post form */
    this._postForm.querySelector(".avatar").src = this._user.avatarURL;

    /* Create a User instance for later use */
    let user = new User(this._user);

    let header = document.querySelector("#header");
    let title = header.querySelector(".brand");
    title.textContent = "Mood Journal - " + user.name;

    /* Load the feed of the user */
    let dates = [];
    let posts = await user.getFeed();
    for (let data of posts) {
      let post = new Post(data);
      dates.push(post.time.toLocaleString())
      this._displayPost(post);
    }

    // Load (or reload) data for the mood chart 
    let moodChartElem = document.querySelector("#moodChart");
    let chartInstance = Chart.getChart(moodChartElem);
    if (chartInstance) {
      chartInstance.destroy();
    }
    let moodChart = new Chart(moodChartElem, {
      type: "line",
      data: {
        labels: dates,
        datasets: [{
          label: "Mood",
          data: user.moodLevels
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    moodChart.update();

    // calculate the average mood
    let sum = user.moodLevels.reduce((acc, curr) => acc + curr, 0);
    let avgMood = Math.ceil(sum / user.moodLevels.length);
    let avgMoodElem = document.querySelector("#averageMood").querySelector(".avgMood");
    if (avgMood === 1) {
      avgMoodElem.src = "images/madBig.png";
    } else if (avgMood === 2) {
      avgMoodElem.src = "images/sadBig.png";
    } else if (avgMood === 3) {
      avgMoodElem.src = "images/mehBig.png";
    } else if (avgMood === 4) {
      avgMoodElem.src = "images/goodBig.png";
    } else if (avgMood === 5) {
      avgMoodElem.src = "images/greatBig.png";
    }
  }
}
