import requests
from bs4 import BeautifulSoup
from bs4.element import NavigableString
from retry import retry

from utils.logger import get_logger

logger = get_logger(__name__)

QAT_DICTIONARIES = ["UKACD", "YAWL", "ABLE",
                    "Moby", "PDL", "BNC", "Broda", "Union"]


def parse_html(html_content):
    # 创建 BeautifulSoup 对象
    soup = BeautifulSoup(html_content, 'html.parser')

    # 初始化结果字典
    result = {}

    # 找到所有的 <b> 标签
    for bold_tag in soup.find_all('b'):
        # 检查标签文本是否以 "Length" 开头
        if bold_tag.text.startswith('Length '):
            # 提取单词长度
            length = int(bold_tag.text.split()[1])

            # 初始化变量用于存储单词节点
            word_node = None
            current = bold_tag.next_sibling

            # 在后续兄弟节点中查找文本节点
            while current:
                # 找到第一个文本节点（跳过 <br> 等标签）
                if isinstance(current, NavigableString) and current.strip():
                    word_node = current
                    break
                current = current.next_sibling

            # 处理找到的单词列表文本
            if word_node:
                words = word_node.strip().split()
                result[length] = words

    return result


@retry(tries=3, delay=1)
def req_qat(pat, dict="YAWL"):
    logger.debug(f"Requesting QAT with pattern: {pat}, dictionary: {dict}")
    pat = pat.replace(":", "%3A")
    pat = pat.replace("/", "%2F")
    if isinstance(dict, str):
        if dict not in QAT_DICTIONARIES:
            raise ValueError(
                f"Dictionary '{dict}' is not supported. Choose from {QAT_DICTIONARIES}.")
        dict = QAT_DICTIONARIES.index(dict)
    url = f"https://www.quinapalus.com/cgi-bin/qat?pat={pat}&dict={dict}"
    response = requests.get(url, timeout=10)
    if response.status_code != 200:
        raise ConnectionError(
            f"Failed to connect to QAT service. Status code: {response.status_code}")
    return parse_html(response.content)


def get_words(analyze_result, dictionary="YAWL"):
    max_length = analyze_result.get('max_length', 9)
    categories = analyze_result.get('categories', {})

    # TODO: 目前只是简单策略，需要补充更详细策略
    letters = []
    for category, items in categories.items():
        for item in items:
            if 'matches' in item and len(item['matches']) > 0:
                letter = item['matches'][0]['letter']
                letters.append(letter)

    results = {}
    for length in range(max_length, 0, -1):
        if length < 5 and sum([len(v) for v in results.values()]) > 0:
            break
        if length not in results:
            results[length] = []
        pat = f'{length}:*/' + \
            ''.join(letters).replace("*", ".").replace("!", "").lower()
        try:
            words = req_qat(pat, dict=dictionary)
            if length in words:
                results[length] += words[length]
        except Exception as e:
            print(f"Error fetching words for pattern '{pat}': {e}")

    return results


if __name__ == "__main__":
    import sys
    import os
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(os.path.dirname(current_dir))  # 添加上级目录到路径中
    from src.analyze import analyze
    analyze_result = analyze("example.png")
    words = get_words(analyze_result)
    print(words)
