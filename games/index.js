document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput")
  const gamesGrid = document.getElementById("gamesGrid")
  const gameCards = document.querySelectorAll(".game-card")

  searchInput.addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase().trim()

    gameCards.forEach((card) => {
      const gameTitle = card.querySelector("h3").textContent.toLowerCase()
      const gameDescription = card.querySelector("a").textContent.toLowerCase()

      // Search for complete words and phrases
      const titleWords = gameTitle.split(/\s+/)
      const descWords = gameDescription.split(/\s+/)
      const searchWords = searchTerm.split(/\s+/)

      let matches = false

      if (searchTerm === "") {
        matches = true
      } else {
        // Check if search term matches any complete words or if title/description contains the full search phrase
        matches = searchWords.every(
          (searchWord) =>
            titleWords.some((word) => word.includes(searchWord)) ||
            descWords.some((word) => word.includes(searchWord)) ||
            gameTitle.includes(searchTerm) ||
            gameDescription.includes(searchTerm),
        )
      }

      if (matches) {
        card.style.display = "block"
        card.classList.add("fade-in")
      } else {
        card.style.display = "none"
        card.classList.remove("fade-in")
      }
    })
  })

  // Game card click functionality
  gameCards.forEach((card) => {
    card.addEventListener("click", function () {
      const gameUrl = this.getAttribute("data-url")

      if (gameUrl) {
        // Add loading state
        this.classList.add("loading")

        // Simulate loading delay
        setTimeout(() => {
          window.location.href = gameUrl
        }, 500)
      }
    })
  })

  // Add fade-in animation to all cards on load
  setTimeout(() => {
    gameCards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add("fade-in")
      }, index * 50)
    })
  }, 100)
})
