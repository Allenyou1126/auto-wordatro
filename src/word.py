import requests
from bs4 import BeautifulSoup
from bs4.element import NavigableString
from retry import retry
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
import itertools

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


def gen_perms(word, n_ex):
    n = len(word) + n_ex
    perms = []
    for pos in itertools.combinations(range(n), len(word)):
        arr = ['!'] * n
        for i in range(len(pos)):
            arr[pos[i]] = word[i]
        perms.append(''.join(arr))
    return perms


def fill_word(word, letters, strategy="bold97"):
    unused = letters.copy()
    length = len(word)
    place: list[tuple[str, str] | None] = [None for _ in range(length)]

    def fill(i, order):
        c = word[i]
        if c == '!':
            unused.remove(('special', '!'))
            place[i] = ('special', '!')
            return
        for font in order:
            if (font, c) in unused:
                unused.remove((font, c))
                place[i] = (font, c)
                return
        if ('special', '*') in unused:
            unused.remove(('special', '*'))
            place[i] = ('special', '*')
            return
        raise ValueError(
            f"Cannot fill position {i} in word '{word}' with order {order}, place: {place}, unused: {unused}")

    if strategy.startswith("bold"):
        b_range = []
        if strategy == "bold97":
            b_range = [8, 6]
        elif strategy == "bold975":
            b_range = [8, 6, 4]
        for i in b_range:
            if i >= length:
                continue
            fill(i, ['bold', 'underscore', 'italic', 'special', 'regular'])
        for i in range(length - 1, -1, -1):
            if i in b_range:
                continue
            if i >= 4:
                fill(i, ['underscore', 'italic', 'special', 'regular', 'bold'])
            else:
                fill(i, ['italic', 'underscore', 'special', 'regular', 'bold'])
        assert None not in place, f"Some positions in word '{word}' were not filled: {place}"
        return place, unused
    else:
        raise ValueError(f"Unknown strategy: {strategy}")


def eval_word(place, unused, stargy="bold97"):
    score = 0
    n = len(place)
    if stargy.startswith("bold"):
        if n >= 9:
            score += 1000000000
            if place[8][0] == 'bold':
                score += 1000000000
        if n >= 7:
            score += 10000000
            if place[6][0] == 'bold':
                score += 1000000
        if '5' in stargy and n >= 5:
            score += 100000
            if place[4][0] == 'bold':
                score += 100000
        score += unused.count(('special', '*')) * 10000
        score += unused.count(('special', '!')) * 1000
        score += len([l for l in unused if l[0] == 'bold']) * 100
        score += sum([i + 1 for i, l in enumerate(place)
                     if l[0] == 'underscore']) * 10
        score += sum([n - i for i, l in enumerate(place) if l[0] == 'italic'])
        return score
    else:
        raise ValueError(f"Unknown strategy: {stargy}")


def solve_word(word, letters, n_ex, strategy="bold97"):
    word = word.upper()
    perms = gen_perms(word, n_ex)
    results = []
    for perm in perms:
        try:
            place, unused = fill_word(perm, letters, strategy)
            score = eval_word(place, unused, strategy)
            results.append((perm, place, unused, score))
        except ValueError as e:
            logger.debug(f"Failed to fill word '{word}' with error: {e}")

    results.sort(key=lambda x: x[-1], reverse=True)  # 按分数降序排序
    return results[0] if results else None


def get_words(analyze_result, dictionary="YAWL", strategy="bold97"):
    max_length = analyze_result.get('max_length', 9)
    categories = analyze_result.get('categories', {})

    letters = []
    for category, items in categories.items():
        for item in items:
            if 'matches' in item and len(item['matches']) > 0:
                font = item['matches'][0]['font']
                letter = item['matches'][0]['letter']
                letters.append((font, letter))

    # 初始化结果字典
    results = {}
    pat = ''.join([l[1] for l in letters]).replace(
        "*", ".").replace("!", "").lower()

    # 辅助函数：为单个长度请求单词
    def _request_words_for_length(l):
        try:
            # 检查是否已有结果且不再需要短词
            # if l < 5 and any(results.values()):
            # return l, []  # 跳过短词

            lpat = f'{l}:*/' + pat
            words = req_qat(lpat, dict=dictionary)
            return l, words.get(l, [])
        except Exception as e:
            logger.error(f"Error fetching words for length {l}: {e}")
            return l, []

    # 使用线程池并行处理
    min_length = 1 if strategy == "None" else 5
    lengths = list(range(max_length, min_length - 1, -1))
    with ThreadPoolExecutor(max_workers=min(5, len(lengths))) as executor:  # 限制最大线程数
        futures = [executor.submit(_request_words_for_length, l)
                   for l in lengths]

        for future in concurrent.futures.as_completed(futures):
            l, word_list = future.result()
            results[l] = word_list

    if strategy == "None":
        return results

    n_ex = ''.join([l[1] for l in letters]).count("!")
    final_results = {}
    for length, words in results.items():
        if not words:
            continue
        max_ex = min(n_ex, max_length - length)
        for ex in range(max_ex + 1):
            exlength = length + ex
            if exlength not in final_results:
                final_results[exlength] = []
            for word in words:
                try:
                    sol_word_result = solve_word(word, letters, ex, strategy)
                    if sol_word_result is not None:
                        perm, place, unused, score = sol_word_result
                        final_results[exlength].append({
                            'word': word,
                            'perm': perm,
                            'place': place,
                            'unused': unused,
                            'score': score
                        })
                except ValueError as e:
                    logger.debug(
                        f"Failed to solve word '{word}' with error: {e}")
    for length, words in final_results.items():
        if not words:
            del final_results[length]
        else:
            final_results[length] = sorted(
                words, key=lambda x: x['score'], reverse=True)
            final_results[length] = [x['perm'] for x in final_results[length]]
    return final_results


if __name__ == "__main__":
    import sys
    import os
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(os.path.dirname(current_dir))  # 添加上级目录到路径中
    from src.analyze import analyze
    analyze_result = analyze("example.png")
    words = get_words(analyze_result)
    print(words)
