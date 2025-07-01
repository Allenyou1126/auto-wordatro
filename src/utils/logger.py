import logging
import sys


def get_logger(name=__name__):
    """获取配置好的日志记录器"""
    logger = logging.getLogger(name)

    if not logger.hasHandlers():
        handler = logging.StreamHandler(stream=sys.stdout)
        logger.setLevel(logging.DEBUG)
        logger.addHandler(handler)

    return logger
