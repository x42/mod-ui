import os
from mod.settings import API_KEY, DEVICE_KEY, DEVICE_TAG, DEVICE_UID

def get_uid():
    if DEVICE_UID is None:
        raise Exception('Missing device uid')
    return DEVICE_UID

def get_tag():
    if DEVICE_TAG is None:
        raise Exception('Missing device tag')
    return DEVICE_TAG

def get_device_key():
    if DEVICE_KEY is None:
        raise Exception('Missing device key')
    if os.path.isfile(DEVICE_KEY):
        with open(DEVICE_KEY, 'r') as fh:
            return fh.read()
    return DEVICE_KEY

def get_server_key():
    if API_KEY is None:
        raise Exception('Missing API key')
    if os.path.isfile(API_KEY):
        with open(API_KEY, 'r') as fh:
            return fh.read()
    return API_KEY