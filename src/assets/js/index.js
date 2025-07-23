document.querySelector("form").addEventListener("submit", function (e) {
  e.preventDefault();

  // Ngambil value inputan

  const project = document.getElementById("project").value.trim();
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const description = document.getElementById("description").value.trim();
  const imageFile = document.getElementById("imageUpload").files[0];

  //   ngecek apabila ada inputan kosong
  if (!project || !startDate || !endDate || !description || !imageFile) {
    alert("Semua kolom wajib diisi!");
    return;
  }

  const selectedTechs = Array.from(
    document.querySelectorAll("input[name='tech']:checked")
  );

  // const techValues = selectedTechs.map((input) => input.value);
  // console.log(techValues);

  if (selectedTechs.length === 0) {
    alert("Choose at least one technologies!");
    return;
  }

  const techIconMap = {
    nodeJS: "assets/icon/node-js.png",
    nextJS: "assets/icon/nextJs.png",
    reactJS: "assets/icon/reactJs.png",
    typeScript: "assets/icon/typescript.png",
  };

  const tech = selectedTechs
    .map((input) => {
      const iconSrc = techIconMap[input.value];
      return `<img src="${iconSrc}" alt="${input.value}" title="${input.value}" class="tech-icon" />`;
    })
    .join("");
  console.log(tech);

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;
  const projectTimeText =
    (months > 0 ? `${months} bulan ` : "") + (days > 0 ? `${days} hari` : "") ||
    "0 hari";

  // console.log(diffTime);

  const list = document.querySelector(".listProject");

  const createCard = (imgSrc = "") => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
          ${imgSrc ? `<img src="${imgSrc}" class="card-image" />` : ""}
          <div class="card-content">
            <div class="card-top">
              <h3 class="card-title">${project}</h3>
              <p class="card-time">${projectTimeText}</p>
              <p class="card-description">${description}</p>
            </div>
            <div class="card-bottom">
              <div class="card-tech">${tech}</div>
              <div class="card-actions">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
              </div>
            </div>
          </div>
        `;
    console.log(JSON.stringify(selectedTechs));

    const deleteBtn = card.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", function () {
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
    e.target.reset();
  };

  if (imageFile) {
    const reader = new FileReader();
    reader.onload = function (e) {
      createCard(e.target.result);
    };
    reader.readAsDataURL(imageFile);
  } else {
    createCard();
  }
});
