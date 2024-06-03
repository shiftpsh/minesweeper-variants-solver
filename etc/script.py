from PIL import Image

tiles = [
    "null", "flag", "hidden",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "10", "11", "12", "13", "14",
    "1,1", "1,2", "1,3", "1,4", "1,5",
    "2,2", "2,3", "2,4", "3,3",
    "1,1,1", "1,1,2", "1,1,3", "1,2,2", "1,1,1,1"
]


def transform(image_name):
    file_name = f"t{image_name}.png"
    image_name_replaced = image_name.replace(",", "_")
    script_name = f"./output/s{image_name_replaced}.ts"
    image = Image.open(file_name)
    script = open(script_name, "w+")

    ret = []
    for i in range(image.width):
        for j in range(image.height):
            pixel = image.getpixel((i, j))
            ret.append(1 if pixel[0] < 128 else 0)

    script.write(f"const data = {ret};\nconst tile = {'{'} data, name: '{image_name_replaced}' {'};'}\nexport default tile;")
    script.close()


def main():
    for tile in tiles:
        transform(tile)


if __name__ == "__main__":
    main()
