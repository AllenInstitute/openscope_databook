
import h5py
import os
from random import randint

from dandi import download
from dandi import dandiapi
from fsspec.implementations.cached import CachingFileSystem
from fsspec import filesystem
from pynwb import NWBHDF5IO


# downloads an NWB file from DANDI to download_loc, opens it, and returns the IO object for the NWB
# dandi_api_key is required to access files from embargoed dandisets
def dandi_download_open(dandiset_id, dandi_filepath, download_loc, dandi_api_key=None, force_overwrite=False):
    client = dandiapi.DandiAPIClient(token=dandi_api_key)
    dandiset = client.get_dandiset(dandiset_id)

    file = dandiset.get_asset_by_path(dandi_filepath)
    file_url = file.download_url

    filename = dandi_filepath.split("/")[-1]
    filepath = f"{download_loc}/{filename}"

    if os.path.exists(filepath) and not force_overwrite:
        print("File already exists")
    else:
        download.download(file_url, output_dir=download_loc)
        print(f"Downloaded file to {filepath}")

    if os.environ.get("TESTING", false):
        old_filepath = filepath
        filepath = f"{download_loc}/{str(randint(0, 100000))}"
        os.rename(filepath, new_filepath)

    print("Opening file")
    io = NWBHDF5IO(filepath, mode="r", load_namespaces=True)
    return io


# streams an NWB file remotely from DANDI, opens it, and returns the IO object for the NWB
# dandi_api_key is required to access files from embargoed dandisets
def dandi_stream_open(dandiset_id, dandi_filepath, dandi_api_key=None):
    client = dandiapi.DandiAPIClient(token=dandi_api_key)
    dandiset = client.get_dandiset(dandiset_id)

    file = dandiset.get_asset_by_path(dandi_filepath)
    base_url = file.client.session.head(file.base_download_url)
    file_url = base_url.headers["Location"]

    fs = CachingFileSystem(
        fs=filesystem("http")
    )

    f = fs.open(file_url, "rb")
    file = h5py.File(f)
    io = NWBHDF5IO(file=file, mode='r', load_namespaces=True)
    return io
