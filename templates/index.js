<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Slider Animation with Server-Side GIF Generation</title>
    <link href="https://unpkg.com/cropperjs/dist/cropper.css" rel="stylesheet">
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            background-color: #f0f0f0;
        }
        .input-group {
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }
        input[type="file"] {
            margin-left: 10px;
        }
        img.thumbnail {
            margin-left: 10px;
            width: 100px;
            height: 100px;
            object-fit: cover;
            border: 1px solid #ccc;
        }
        button {
            margin-top: 10px;
            padding: 10px 20px;
        }
        #imageEditorModal {
            display: none;
            position: fixed;
            left: 50%;
            transform: translateX(-50%);
            bottom: 3rem;
            width: 70%;
            background: #fff;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            padding: 20px;
            z-index: 1000;
            text-align: center;
        }
        #cropImage {
            max-width: 100%;
            height: auto;
        }
        #generatedGif {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="input-group">
        <label>Image 1:</label>
        <input type="file" id="image1Input" accept="image/*">
        <img id="image1Thumbnail" class="thumbnail" alt="Image 1 Thumbnail">
    </div>
    <div class="input-group">
        <label>Image 2:</label>
        <input type="file" id="image2Input" accept="image/*">
        <img id="image2Thumbnail" class="thumbnail" alt="Image 2 Thumbnail">
    </div>
    <div class="input-group">
        <label>Transition Type:</label>
        <select id="transitionType">
            <option value="default">Sliding</option>
            <option value="rotate">Rotating</option>
        </select>
    </div>
    <canvas id="canvas" width="256" height="256" style="display: none;"></canvas>
    <img id="generatedGif" alt="Generated GIF" style="display: none;">
    <button id="downloadGif" style="display: none;">Download GIF</button>
    <div id="status"></div>

    <!-- Image editor modal -->
    <div id="imageEditorModal">
        <img id="cropImage" src="" alt="Image to crop">
        <br>
        <button id="cropButton">Crop</button>
    </div>

    <script src="https://unpkg.com/cropperjs"></script>
    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const statusDiv = document.getElementById('status');
        const imageEditorModal = document.getElementById('imageEditorModal');
        const cropImage = document.getElementById('cropImage');
        const cropButton = document.getElementById('cropButton');
        const image1Thumbnail = document.getElementById('image1Thumbnail');
        const image2Thumbnail = document.getElementById('image2Thumbnail');
        const generatedGif = document.getElementById('generatedGif');
        const downloadGifButton = document.getElementById('downloadGif');
        const transitionTypeSelect = document.getElementById('transitionType');

        let cropper;
        let currentImageInput;
        let currentThumbnail;
        let croppedImages = {
            'image1': null,
            'image2': null
        };
        const defaultImages = {
            'image1': 'https://th.bing.com/th/id/OIG1.jQk9obHLZDzKMIQQi_p3?pid=ImgGn',
            'image2': 'https://th.bing.com/th/id/OIG4.Pyn6Qnls3A8X.VgxaLIn?pid=ImgGn'
        };

        function showImageEditor(imageSrc) {
            cropImage.src = imageSrc;
            imageEditorModal.style.display = 'block';
            cropper = new Cropper(cropImage, {
                aspectRatio: 1,
                viewMode: 1
            });
        }

        function hideImageEditor() {
            if (cropper) {
                cropper.destroy();
            }
            imageEditorModal.style.display = 'none';
        }

        function dataURLtoFile(dataurl, filename) {
            const arr = dataurl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], filename, { type: mime });
        }

        function loadImage(input, callback) {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    callback(e.target.result);
                }
                reader.readAsDataURL(input.files[0]);
            }
        }

        function handleImageUpload(input, thumbnail, key) {
            loadImage(input, (imageSrc) => {
                currentImageInput = input;
                currentThumbnail = thumbnail;
                showImageEditor(imageSrc);
                currentThumbnail.dataset.key = key;
            });
        }

        image1Input.addEventListener('change', function () {
            handleImageUpload(image1Input, image1Thumbnail, 'image1');
        });

        image2Input.addEventListener('change', function () {
            handleImageUpload(image2Input, image2Thumbnail, 'image2');
        });

        cropButton.addEventListener('click', function () {
            const croppedCanvas = cropper.getCroppedCanvas();
            const croppedImage = croppedCanvas.toDataURL('image/png');
            const originalFileName = currentImageInput.files[0].name;
            const croppedFileName = originalFileName.replace(/\.[^/.]+$/, "") + "_crop.png";
            const file = dataURLtoFile(croppedImage, croppedFileName);

            const key = currentThumbnail.dataset.key;
            croppedImages[key] = file;
            currentThumbnail.src = croppedImage;

            hideImageEditor();

            // Replace the current image input file with the cropped file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            currentImageInput.files = dataTransfer.files;

            generateGif();
        });

        transitionTypeSelect.addEventListener('change', function () {
            generateGif();
        });

        function generateGif() {
            statusDiv.textContent = 'Generating GIF...';

            const formData = new FormData();
            formData.append('images', croppedImages['image1'] || dataURLtoFile(defaultImages['image1'], 'image1_default.png'));
            formData.append('images', croppedImages['image2'] || dataURLtoFile(defaultImages['image2'], 'image2_default.png'));
            formData.append('transition_type', transitionTypeSelect.value);

            fetch('/generate_gif', {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (response.ok) {
                    return response.blob();
                } else {
                    return response.json().then(errorData => { throw new Error(errorData.error); });
                }
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                generatedGif.src = url;
                generatedGif.style.display = 'block';
                downloadGifButton.style.display = 'block';
                downloadGifButton.onclick = () => {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'animation.gif';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                };
                statusDiv.textContent = '';
            })
            .catch(error => {
                statusDiv.textContent = 'Error generating GIF: ' + error.message;
                console.error('Error generating GIF:', error);
            });
        }

        // Load default images
        function loadDefaultImages() {
            image1Thumbnail.src = defaultImages['image1'];
            image2Thumbnail.src = defaultImages['image2'];

            fetch(defaultImages['image1'])
                .then(response => response.blob())
                .then(blob => {
                    const file = new File([blob], 'image1_default.png', { type: 'image/png' });
                    croppedImages['image1'] = file;
                });

            fetch(defaultImages['image2'])
                .then(response => response.blob())
                .then(blob => {
                    const file = new File([blob], 'image2_default.png', { type: 'image/png' });
                    croppedImages['image2'] = file;
                })
                .then(() => {
                    generateGif();
                });
        }

        window.onload = loadDefaultImages;
    </script>
</body>
</html>
