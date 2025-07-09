import logging
import os
import sys


def get_logger(name=__name__):
    """获取配置好的日志记录器"""
    logger = logging.getLogger(name)

    if not logger.hasHandlers():
        level = os.getenv("LOG_LEVEL", "DEBUG").upper()
        handler = logging.StreamHandler(stream=sys.stdout)
        formatter = logging.Formatter(
            "%(asctime)s %(name)s %(levelname)s %(message)s")
        handler.setFormatter(formatter)
        match level:
            case "DEBUG":
                logger.setLevel(logging.DEBUG)
            case "INFO":
                logger.setLevel(logging.INFO)
            case "WARNING":
                logger.setLevel(logging.WARNING)
            case "ERROR":
                logger.setLevel(logging.ERROR)
            case "CRITICAL":
                logger.setLevel(logging.CRITICAL)
            case _:
                logger.setLevel(logging.INFO)
        logger.addHandler(handler)

    return logger
