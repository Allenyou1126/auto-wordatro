import cv2
import numpy as np
from PIL import Image
import win32gui
import win32ui
import win32con
import win32api
import time
import datetime
import os


def get_window_rect(window_title):
    """获取指定窗口的坐标和尺寸（支持多显示器）"""
    hwnd = win32gui.FindWindow(None, window_title)
    if not hwnd:
        raise Exception(f"找不到窗口: {window_title}")

    # 确保窗口不是最小化状态
    if win32gui.IsIconic(hwnd):
        win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)

    # 将窗口置于前台
    win32gui.SetForegroundWindow(hwnd)
    time.sleep(0.5)  # 等待窗口激活

    # 获取窗口位置信息
    try:
        # 获取精确尺寸
        left, top, right, bottom = win32gui.GetWindowRect(hwnd)
        client_left, client_top, client_right, client_bottom = win32gui.GetClientRect(
            hwnd)
        client_width = client_right - client_left
        client_height = client_bottom - client_top

        print(f"窗口尺寸 (含边框): {right-left}x{bottom-top}")
        print(f"窗口内容尺寸: {client_width}x{client_height}")

        return hwnd, (left, top, left + client_width, top + client_height)
    except:
        # 回退方法：直接使用GetWindowRect
        rect = win32gui.GetWindowRect(hwnd)
        return hwnd, rect


def capture_screen_region(rect):
    """捕获屏幕指定区域（支持多显示器）"""
    left, top, right, bottom = rect
    width = right - left
    height = bottom - top

    # 获取整个桌面的设备上下文
    desktop_dc = win32gui.GetWindowDC(win32gui.GetDesktopWindow())
    dc_obj = win32ui.CreateDCFromHandle(desktop_dc)
    mem_dc = dc_obj.CreateCompatibleDC()

    # 创建位图对象
    data_bitmap = win32ui.CreateBitmap()
    data_bitmap.CreateCompatibleBitmap(dc_obj, width, height)
    mem_dc.SelectObject(data_bitmap)

    # 复制屏幕区域
    mem_dc.BitBlt((0, 0), (width, height), dc_obj,
                  (left, top), win32con.SRCCOPY)

    # 转换为PIL图像
    bmp_info = data_bitmap.GetInfo()
    bmp_str = data_bitmap.GetBitmapBits(True)
    pil_img = Image.frombuffer(
        'RGB',
        (bmp_info['bmWidth'], bmp_info['bmHeight']),
        bmp_str, 'raw', 'BGRX', 0, 1
    )

    # 清理资源
    mem_dc.DeleteDC()
    dc_obj.DeleteDC()
    win32gui.DeleteObject(data_bitmap.GetHandle())
    win32gui.ReleaseDC(win32gui.GetDesktopWindow(), desktop_dc)

    return pil_img


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


def main():
    window_title = "Wordatro!"

    # 可调整参数区域
    # ------------------------------
    tolerance = 10  # 颜色检测容差（0-100）
    min_area = 2000  # 最小区域面积（像素）
    # ------------------------------

    try:
        hwnd, rect = get_window_rect(window_title)
        left, top, right, bottom = rect
        print(f"窗口位置: 左={left}, 上={top}, 宽={right-left}, 高={bottom-top}")
    except Exception as e:
        print(f"获取窗口失败: {e}")
        return

    # 确保目标目录存在
    output_dir = "capture"
    os.makedirs(output_dir, exist_ok=True)
    x1, y1 = rect[0], rect[1]
    win32api.SetCursorPos((x1, y1))
    time.sleep(1)  # 等待窗口稳定

    try:
        pil_img = capture_screen_region(rect)
        img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        print(f"窗口捕获失败: {e}")
        return

    img_height, img_width = img.shape[:2]
    print(f"捕获图像尺寸: {img_width}x{img_height}")

    # 创建多颜色掩码（可调整容差）
    target_colors_rgb = [
        (241, 235, 223),  # #f1ebdf
        (186, 255, 137),  # #baff89
        (253, 216, 75),   # #fdd84b
        (255, 250, 156),  # #fffa9c
        (254, 254, 202)   # #fefeca
    ]
    mask = find_colored_regions(img, target_colors_rgb, tolerance=tolerance)

    # 创建原始图像的副本用于调试
    debug_img = img.copy()

    # 使用connectedComponents获取连通分量
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        mask, connectivity=8)
    print(f"检测到 {num_labels - 1} 个连通分量")  # 减去背景标签

    valid_regions = get_valid_regions(img, mask, min_area=min_area)
    print(f"找到 {len(valid_regions)} 个符合条件的彩色区域（容差={tolerance}，最小面积={min_area}）")

    # 保存调试图像
    # cv2.imwrite(f"{output_dir}/multicolor_mask_tolerance{tolerance}.jpg", mask)
    # cv2.imwrite(f"{output_dir}/detection_result_tolerance{tolerance}.jpg", debug_img)

    # 保存每个有效区域
    for region_info in valid_regions:
        timestr = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        region_id = region_info["id"]
        region_img = region_info["region"]

        # 确保区域具有合理尺寸
        if region_img.shape[0] > 0 and region_img.shape[1] > 0:
            # 调整为统一尺寸
            resized_region = cv2.resize(region_img, (128, 128))
            output_path = f"{output_dir}/region_{timestr}_{region_id}.bmp"
            cv2.imwrite(output_path, resized_region)
            print(f"保存区域 #{region_id} 到 {output_path}")

    # 显示结果
    # cv2.imshow("Captured Image", img)
    # cv2.imshow("Mask Regions", mask)
    # cv2.imshow("Detection Result", debug_img)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
