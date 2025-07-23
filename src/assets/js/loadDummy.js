import dummyProjects from "./dummy.js";

const techIconMap = {
  nodeJS: "../uploads/icon/node-js.png",
  nextJS: "../uploads/icon/nextJs.png",
  reactJS: "../uploads/icon/reactJs.png",
  typeScript: "../uploads/icon/typescript.png",
};

function calculateDuration(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;
  return (
    (months ? `${months} bulan ` : "") + (days ? `${days} hari` : "") ||
    "0 hari"
  );
}

function renderDummyProjects() {
  const list = document.querySelector(".listProject");

  dummyProjects.forEach((item) => {
    const techIcons = item.tech
      .map(
        (t) => `<img src="${techIconMap[t]}" alt="${t}" class="tech-icon" />`
      )
      .join("");

    const duration = calculateDuration(item.startDate, item.endDate);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${item.imageSrc}" class="card-image" />
      <div class="card-content">
        <div class="card-top">
          <h3 class="card-title">${item.project}</h3>
          <p class="card-time">${duration}</p>
          <p class="card-description">${item.description}</p>
        </div>
        <div class="card-bottom">
          <div class="card-tech">${techIcons}</div>
          <div class="card-actions">
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
          </div>
        </div>
      </div>
    `;

    card.querySelector(".delete-btn").addEventListener("click", () => {
      Swal.fire({
        title: "Apakah kamu yakin?",
        text: "Data ini akan dihapus secara permanen!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Ya, hapus!",
        cancelButtonText: "Batal",
      }).then((result) => {
        if (result.isConfirmed) {
          card.remove();
          Swal.fire("Terhapus!", "Project berhasil dihapus.", "success");
        }
      });
    });

    list.prepend(card);
  });
}

document.addEventListener("DOMContentLoaded", renderDummyProjects);
