import os

import cv2
import numpy as np

from utils.logger import get_logger
from utils.path import TEMPLATE_DIR, UPLOAD_DIR


logger = get_logger(__name__)

CATEGORY_COLORS = {
    "Regular": [(241, 235, 223)],  # #f1ebdf
    "Improved": [(186, 255, 137)],  # baff89
    "Special": [                   # 多个颜色作为整体
        (253, 216, 75),   # #fdd84b
        (255, 250, 156),  # #fffa9c
        (254, 254, 202)   # #fefeca
    ]
}


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
    template_folder = os.path.join(TEMPLATE_DIR, category)
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


def find_colored_regions(img, target_colors_rgb, tolerance=10):
    """在图像中查找指定颜色区域并返回二值掩码（容差可调整）"""

    # 创建空白掩码
    combined_mask = np.zeros(img.shape[:2], dtype=np.uint8)

    # 处理每个目标颜色
    for color_rgb in target_colors_rgb:
        # 转换颜色到BGR顺序（OpenCV使用BGR）
        color_bgr = np.array(
            [color_rgb[2], color_rgb[1], color_rgb[0]], dtype=int)

        # 计算容差范围
        lower_color = np.clip(color_bgr - tolerance, 0, 255).astype(np.uint8)
        upper_color = np.clip(color_bgr + tolerance, 0, 255).astype(np.uint8)
        # print(f"处理颜色: {color_rgb} (BGR: {color_bgr.tolist()})，容差范围: {lower_color.tolist()} - {upper_color.tolist()}")
        # 创建颜色掩码
        color_mask = cv2.inRange(img, lower_color, upper_color)

        # 将当前颜色的掩码加入到组合掩码中
        combined_mask = cv2.bitwise_or(combined_mask, color_mask)

    # 形态学操作增强区域
    kernel = np.ones((5, 5), np.uint8)
    cleaned_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
    cleaned_mask = cv2.morphologyEx(cleaned_mask, cv2.MORPH_OPEN, kernel)

    return cleaned_mask


def get_valid_regions(img, mask, min_area=2000):
    """从掩码中提取符合条件的区域"""
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        mask, connectivity=8)

    valid_regions = []
    for label in range(1, num_labels):  # 跳过背景标签0
        x = stats[label, cv2.CC_STAT_LEFT]
        y = stats[label, cv2.CC_STAT_TOP]
        w = stats[label, cv2.CC_STAT_WIDTH]
        h = stats[label, cv2.CC_STAT_HEIGHT]
        area = stats[label, cv2.CC_STAT_AREA]

        if area >= min_area:
            cropped_img = img[y:y+h, x:x+w].copy()
            valid_regions.append({
                "id": label,
                "bbox": (x, y, w, h),
                "region": cropped_img
            })

    return valid_regions


def analyze(filename: str):
    # 确保模板目录存在
    for folder in CATEGORY_COLORS.keys():
        os.makedirs(os.path.join(
            TEMPLATE_DIR, folder), exist_ok=True)

    filepath = os.path.join(UPLOAD_DIR, filename)

    # 读取图像
    img = cv2.imread(filepath)
    if img is None:
        logger.debug(f"无法读取图像: {filepath}")
        return None

    # 创建调试图像
    debug_img = img.copy()
    all_results = {}

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
                UPLOAD_DIR, preview_filename)

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
        UPLOAD_DIR, debug_filename)
    cv2.imwrite(debug_filepath, debug_img)

    return {
        "original_image": filename,
        "debug_image": debug_filename,
        "categories": all_results
    }
