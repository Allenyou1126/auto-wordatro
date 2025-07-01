import os
import cv2
import numpy as np
from flask import Flask, render_template, request, redirect, send_from_directory
from werkzeug.utils import secure_filename
import logging
from capture import find_colored_regions, get_valid_regions

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'bmp'}
app.config['TEMPLATE_PATH'] = 'templates'

# 确保上传目录存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['TEMPLATE_PATH'], exist_ok=True)

# 配置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# 辅助函数


def extract_black_part(image):
    """提取图像的黑色部分并二值化"""
    if len(image.shape) > 2:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # 提取黑色区域（0-10灰度值）
    _, binary = cv2.threshold(image, 10, 255, cv2.THRESH_BINARY_INV)
    return binary


def calculate_similarity(img1, img2):
    """计算两个二值图像的相似度（交并比）"""
    # 确保图像为二值格式
    if img1.max() > 1:
        img1 = img1 / 255
    if img2.max() > 1:
        img2 = img2 / 255

    intersection = np.logical_and(img1, img2).sum()
    union = np.logical_or(img1, img2).sum()

    if union == 0:
        return 0.0
    return float(intersection) / float(union)


def match_region(region_img, template_path):
    """匹配区域与模板，返回匹配得分和匹配字母"""
    template = cv2.imread(template_path, cv2.IMREAD_GRAYSCALE)
    if template is None:
        logger.error(f"无法读取模板: {template_path}")
        return 0, "?"

    # 区域预处理
    region_resized = cv2.resize(
        region_img, (template.shape[1], template.shape[0]))
    region_binary = extract_black_part(region_resized)

    # 模板预处理
    template_binary = extract_black_part(template)

    # 计算相似度
    similarity = calculate_similarity(region_binary, template_binary)
    return similarity, os.path.basename(template_path)


def find_all_matches(region_img, category):
    """在指定类别的模板文件夹中查找所有匹配结果"""
    template_folder = os.path.join(app.config['TEMPLATE_PATH'], category)
    matches = []

    for filename in os.listdir(template_folder):
        if filename.startswith("."):
            continue
        file_path = os.path.join(template_folder, filename)
        score, letter = match_region(region_img, file_path)

        # 提取字母名称（移除前缀和后缀）
        letter_name = letter.split('.')[0]
        if '_' in letter_name:
            letter_name = letter_name.split('_')[-1]

        matches.append({
            "template": filename,
            "score": score,
            "letter": letter_name
        })

    # 按相似度从高到低排序
    matches.sort(key=lambda x: x['score'], reverse=True)
    return matches


# 按类别定义颜色
CATEGORY_COLORS = {
    "Regular": [(241, 235, 223)],  # #f1ebdf
    "Improved": [(186, 255, 137)],  # baff89
    "Special": [                   # 多个颜色作为整体
        (253, 216, 75),   # #fdd84b
        (255, 250, 156),  # #fffa9c
        (254, 254, 202)   # #fefeca
    ]
}

# Flask路由


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/analyze', methods=['POST'])
def analyze():
    # 检查上传文件
    if 'image' not in request.files:
        return redirect(request.url)

    file = request.files['image']
    if file.filename == '':
        return redirect(request.url)

    if file and allowed_file(file.filename):
        # 保存上传的图像
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        logger.info(f"图像保存到: {filepath}")

        # 读取图像
        img = cv2.imread(filepath)
        if img is None:
            return render_template('error.html', message="无法读取上传的图像")

        # 创建调试图像
        debug_img = img.copy()
        all_results = {}

        # 处理每个类别
        for category, colors in CATEGORY_COLORS.items():
            # 为该类别检测颜色区域
            mask = find_colored_regions(img, colors, tolerance=10)
            regions = get_valid_regions(img, mask, min_area=2000)
            logger.info(f"{category}区域检测到 {len(regions)} 个有效区域")

            # 按区域面积从大到小排序
            regions.sort(key=lambda r: r["bbox"][2]
                         * r["bbox"][3], reverse=True)

            # 处理每个区域
            category_results = []
            for i, region in enumerate(regions):
                # 在调试图像上标记区域
                x, y, w, h = region["bbox"]
                if category == "Regular":
                    color = (223, 235, 241)  # BGR: #f1ebdf
                elif category == "Improved":
                    color = (137, 255, 186)  # BGR: #baff89
                else:  # Special
                    color = (75, 216, 253)   # BGR: #fdd84b

                cv2.rectangle(debug_img, (x, y), (x + w, y + h), color, 2)
                cv2.putText(debug_img, f"{category[:1]}-{i+1}", (x + 5, y + 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                # 保存区域预览图
                region_img = region["region"]
                preview_filename = f"{os.path.splitext(filename)[0]}_{category[:1]}{i+1}.png"
                preview_path = os.path.join(
                    app.config['UPLOAD_FOLDER'], preview_filename)

                # 在黑色背景上显示区域内容
                preview_img = np.zeros((h, w, 3), dtype=np.uint8)
                preview_img[:region_img.shape[0],
                            :region_img.shape[1]] = region_img
                cv2.imwrite(preview_path, preview_img)

                # 获取该区域所有匹配结果
                matches = find_all_matches(region_img, category)

                # 保存结果
                category_results.append({
                    "id": f"{category[:1]}-{i+1}",
                    "bbox": region["bbox"],
                    "preview": preview_filename,  # 添加预览文件名
                    "matches": matches
                })

            all_results[category] = category_results

        # 保存调试图像
        debug_filename = f"debug_{filename}"
        debug_filepath = os.path.join(
            app.config['UPLOAD_FOLDER'], debug_filename)
        cv2.imwrite(debug_filepath, debug_img)

        return render_template('result.html',
                               original_image=filename,
                               debug_image=debug_filename,
                               categories=all_results)

    return render_template('error.html', message="不支持的文件格式")


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


if __name__ == '__main__':
    # 确保模板目录存在
    for folder in CATEGORY_COLORS.keys():
        os.makedirs(os.path.join(
            app.config['TEMPLATE_PATH'], folder), exist_ok=True)

    app.run(debug=True)
