
import h5py

from dandi import download
from dandi import dandiapi
from fsspec.implementations.cached import CachingFileSystem
from fsspec import filesystem
from pynwb import NWBHDF5IO

# downloads an NWB file from DANDI to download_loc, opens it, and returns the NWB object
# dandi_api_key is required to access files from embargoed dandisets
def dandi_download_open(dandiset_id, dandi_filepath, download_loc, dandi_api_key=None):
    client = dandiapi.DandiAPIClient(token=dandi_api_key)
    dandiset = client.get_dandiset(dandiset_id)

    file = dandiset.get_asset_by_path(dandi_filepath)
    file_url = file.download_url

    download.download(file_url, output_dir=download_loc)
    
    filename = dandi_filepath.split("/")[-1]
    filepath = f"{download_loc}/{filename}"
    print(f"Downloaded file to {filepath}")

    io = NWBHDF5IO(filepath, mode="r", load_namespaces=True)
    nwb = io.read()
    return nwb

# streams an NWB file remotely from DANDI, opens it, and returns the NWB object
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
    nwb = io.read()
    return nwb
