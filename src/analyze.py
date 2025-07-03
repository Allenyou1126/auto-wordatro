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
            if letter_name == "exclamation":
                letter_name = "!"
            elif letter_name == "wildcard":
                letter_name = "*"

        matches.append({
            "template": filename,
            "score": score,
            "letter": letter_name
        })

    # 按相似度从高到低排序
    matches.sort(key=lambda x: x['score'], reverse=True)
    return matches


def get_mask(img, target_colors_rgb, tolerance=10):
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


def get_valid_regions(img, mask, min_area=0.001, ar=(0, 1), udlr=(0, 0, 0, 0)):
    """从掩码中提取符合条件的区域"""
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        mask, connectivity=8)

    valid_regions = []
    cur_label = 1
    for label in range(1, num_labels):  # 跳过背景标签0
        x = stats[label, cv2.CC_STAT_LEFT]
        y = stats[label, cv2.CC_STAT_TOP]
        w = stats[label, cv2.CC_STAT_WIDTH]
        h = stats[label, cv2.CC_STAT_HEIGHT]
        area = stats[label, cv2.CC_STAT_AREA]

        if min_area is not None:
            if 0 <= min_area <= 1:
                min_area = int(min_area * img.shape[0] * img.shape[1])
            if area < min_area:
                continue
        if ar is not None:
            aspect_ratio = w / h if h > 0 else float('inf')
            if not (ar[0] <= aspect_ratio <= ar[1]):
                continue
        if udlr is not None:
            u, d, l, r = udlr
            if 0 <= u <= 1:
                u = int(u * img.shape[0])
            if 0 <= d <= 1:
                d = int(d * img.shape[0])
            if 0 <= l <= 1:
                l = int(l * img.shape[1])
            if 0 <= r <= 1:
                r = int(r * img.shape[1])
            if not (y >= u and y + h <= img.shape[0] - d and
                    x >= l and x + w <= img.shape[1] - r):
                continue

        valid_regions.append({
            "id": cur_label,
            "bbox": (x, y, w, h),
        })
        cur_label += 1

    return valid_regions


def inverse_color(color: tuple[int, int, int]) -> tuple[int, int, int]:
    return 255 - color[0], 255 - color[1], 255 - color[2]

def annotate_image(img, regions, color=(0, 0, 255), label=None):
    """在图像上标记检测到的区域"""
    for region in regions:
        x, y, w, h = region["bbox"]
        if label:
            txt = f"{label}_{region['id']}"
        else:
            txt = region["id"]
        img = cv2.rectangle(img, (x, y), (x + w, y + h), color, 6)
        img = cv2.putText(img, txt, (x + 5, y + 20),
                          cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    return img

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
        mask = get_mask(img, colors, tolerance=10)
        regions = get_valid_regions(img, mask, min_area=0.001, ar=(0.8, 1.2), udlr=(0.7, 0, 0, 0))
        logger.info(f"{category} 检测到 {len(regions)} 个有效字母")

        debug_img = annotate_image(
            debug_img, regions, color=(0, 0, 255), label=category[:1])

        # 按区域面积从大到小排序
        regions.sort(key=lambda r: r["bbox"][2]
                     * r["bbox"][3], reverse=True)

        # 处理每个区域
        category_results = []
        for i, region in enumerate(regions):
            # 在调试图像上标记区域
            x, y, w, h = region["bbox"]

            # 保存区域预览图
            region_img = img[y:y + h, x:x + w]
            preview_filename = f"{os.path.splitext(filename)[0]}_{category[:1]}{i+1}.png"
            preview_path = os.path.join(
                UPLOAD_DIR, preview_filename)
            cv2.imwrite(preview_path, region_img)

            # 获取该区域所有匹配结果
            matches = find_all_matches(region_img, category)

            # 保存结果
            category_results.append({
                "id": f"{category[:1]}-{i+1}",
                "bbox": {
                    "x": int(x),
                    "y": int(y),
                    "width": int(w),
                    "height": int(h)
                },
                "preview": preview_filename,  # 添加预览文件名
                "matches": matches
            })

        all_results[category] = category_results

    total_regions = sum(len(v) for v in all_results.values())
    if total_regions < 10:
        logger.warning(
            f"检测到的总字母数量 ({total_regions}) 少于 10 个，可能需要调整参数或检查图像质量。")
    else:
        logger.info(f"总共检测到 {total_regions} 个字母")

    white_mask = get_mask(img, [(255, 255, 255)], tolerance=10)
    white_regions = get_valid_regions(img, white_mask, min_area=0.001, ar=(0.8, 1.2), udlr=(0.4, 0.3, 0.15, 0.15))

    debug_img = annotate_image(
        debug_img, white_regions, color=(255, 0, 0), label="W")

    max_length = len(white_regions)
    if max_length < 9:
        logger.warning(
            f"检测到的字母放置区域数量 ({max_length}) 少于 9 个，可能需要调整参数或检查图像质量。")
        max_length = 9
    elif max_length > 10:
        logger.warning(
            f"检测到的字母放置区域数量 ({max_length}) 超过 10 个，可能需要调整参数或检查图像质量。")
        max_length = 10
    else:
        logger.info(f"检测到 {max_length} 个有效字母放置区域")

    # 保存调试图像
    debug_filename = f"debug_{filename}"
    debug_filepath = os.path.join(
        UPLOAD_DIR, debug_filename)
    cv2.imwrite(debug_filepath, debug_img)

    return {
        "original_image": filename,
        "debug_image": debug_filename,
        "categories": all_results,
        "max_length": max_length
    }
