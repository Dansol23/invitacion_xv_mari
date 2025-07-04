// Animación de scroll
const sections = document.querySelectorAll(".section");

function checkScroll() {
  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    const scroll = window.pageYOffset;
    const windowHeight = window.innerHeight;

    if (scroll > sectionTop - windowHeight + sectionHeight / 3) {
      section.classList.add("visible");
    }
  });
}

window.addEventListener("scroll", checkScroll);
checkScroll();

// Variables globales
let currentSlide = 0;
const totalSlides = 3;

// Función para crear corazones flotantes
function createFloatingHearts() {
  const heartsContainer = document.getElementById("hearts");
  const flowersContainer = document.getElementById("hearts");
  if (!heartsContainer && !flowersContainer) return;

  const heart = document.createElement("div");
  heart.classList.add("heart");
  heart.innerHTML = '<i class="fa-solid fa-heart"></i>';
  heart.style.left = Math.random() * 100 + "%";
  heart.style.animationDuration = Math.random() * 3 + 2 + "s";

  heartsContainer.appendChild(heart);

  setTimeout(() => {
    heart.remove();
  }, 8000);
}

// Función para mover el carrusel
function moveCarousel(direction) {
  const track = document.getElementById("carouselTrack");
  if (!track) return;

  currentSlide += direction;

  if (currentSlide >= totalSlides) {
    currentSlide = 0;
  } else if (currentSlide < 0) {
    currentSlide = totalSlides - 1;
  }

  const translateX = -currentSlide * 100;
  track.style.transform = `translateX(${translateX}%)`;

  updateIndicators();
}

// Función para actualizar indicadores del carrusel
function updateIndicators() {
  const indicatorsContainer = document.getElementById("indicators");
  if (!indicatorsContainer) return;

  if (indicatorsContainer.children.length === 0) {
    // Crear indicadores si no existen
    for (let i = 0; i < totalSlides; i++) {
      const indicator = document.createElement("div");
      indicator.classList.add("indicator");
      indicator.addEventListener("click", () => goToSlide(i));
      indicatorsContainer.appendChild(indicator);
    }
  }

  // Actualizar estado activo
  Array.from(indicatorsContainer.children).forEach((indicator, index) => {
    indicator.classList.toggle("active", index === currentSlide);
  });
}

// Función para ir a una diapositiva específica
function goToSlide(slideIndex) {
  const track = document.getElementById("carouselTrack");
  if (!track) return;

  currentSlide = slideIndex;
  const translateX = -currentSlide * 100;
  track.style.transform = `translateX(${translateX}%)`;

  updateIndicators();
}

// Función para manejar el scroll y mostrar secciones
function handleScroll() {
  const sections = document.querySelectorAll(".section");
  const windowHeight = window.innerHeight;

  sections.forEach((section) => {
    const sectionTop = section.getBoundingClientRect().top;
    const sectionVisible = sectionTop < windowHeight * 0.75;

    if (sectionVisible) {
      section.classList.add("visible");
    }
  });
}

// Función para manejar el envío del formulario
async function handleFormSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  const submitButton = form.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;

  try {
    // Cambiar texto del botón mientras se envía
    submitButton.textContent = "Enviando...";
    submitButton.disabled = true;

    const response = await fetch("/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.success) {
      // Mostrar mensaje de éxito
      const confirmationMessage = document.getElementById(
        "confirmationMessage"
      );
      confirmationMessage.style.display = "block";
      confirmationMessage.textContent = result.message;

      // Limpiar formulario
      form.reset();

      // Scroll hasta el mensaje
      confirmationMessage.scrollIntoView({ behavior: "smooth" });
    } else {
      throw new Error(result.message || "Error al enviar la confirmación");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al enviar la confirmación. Por favor, intenta nuevamente.");
  } finally {
    // Restaurar botón
    submitButton.textContent = originalText;
    submitButton.disabled = false;
  }
}

// Event listeners cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
  // Inicializar indicadores del carrusel
  updateIndicators();

  // Crear corazones flotantes periódicamente
  setInterval(createFloatingHearts, 3000);

  // Manejar scroll para animaciones
  window.addEventListener("scroll", handleScroll);
  handleScroll(); // Ejecutar una vez al cargar

  // Manejar envío del formulario
  const form = document.getElementById("confirmationForm");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
  }

  // Auto-play del carrusel (opcional)
  setInterval(() => {
    moveCarousel(1);
  }, 5000);

  // Smooth scroll para enlaces internos
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });
});

// Función para validar formulario en tiempo real
function setupFormValidation() {
  const form = document.getElementById("confirmationForm");
  if (!form) return;

  const requiredFields = form.querySelectorAll("input[required]");

  requiredFields.forEach((field) => {
    field.addEventListener("blur", function () {
      if (this.value.trim() === "") {
        this.style.borderColor = "#ff6b6b";
      } else {
        this.style.borderColor = "#ddd";
      }
    });

    field.addEventListener("input", function () {
      if (this.value.trim() !== "") {
        this.style.borderColor = "#4CAF50";
      }
    });
  });

  // Validación de email
  const emailField = form.querySelector('input[type="email"]');
  if (emailField) {
    emailField.addEventListener("blur", function () {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.value)) {
        this.style.borderColor = "#ff6b6b";
      } else {
        this.style.borderColor = "#4CAF50";
      }
    });
  }
}

// Inicializar validación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", setupFormValidation);
