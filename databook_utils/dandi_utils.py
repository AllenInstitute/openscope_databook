
import h5py
import os
import remfile

from random import randint

from dandi import download
from dandi import dandiapi
from pynwb import NWBHDF5IO


# downloads an NWB file from DANDI to download_loc, opens it, and returns the IO object for the NWB
# dandi_api_key is required to access files from embargoed dandisets
def dandi_download_open(dandiset_id, dandi_filepath, download_loc=None, dandi_api_key=None, force_overwrite=False):
    client = dandiapi.DandiAPIClient(token=dandi_api_key)
    dandiset = client.get_dandiset(dandiset_id)

    file = dandiset.get_asset_by_path(dandi_filepath)
    file_url = file.download_url

    if download_loc == None:
        if "codeocean" in os.environ.get("GIT_ASKPASS", ""):
            download_loc = "../../scratch"
        else:
            download_loc = "."

    filename = dandi_filepath.split("/")[-1]
    filepath = f"{download_loc}/{filename}"

    if os.path.exists(filepath) and not force_overwrite:
        print("File already exists")
    else:
        download.download(file_url, output_dir=download_loc)
        print(f"Downloaded file to {filepath}")

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

    rem_file = remfile.File(file_url)
    h5py_file = h5py.File(rem_file, "r")
    io = NWBHDF5IO(file=h5py_file, mode="r", load_namespaces=True)
    return io
