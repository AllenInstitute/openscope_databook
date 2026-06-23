
import h5py
import os
import remfile

from random import randint
from typing import Union, Iterator, Callable, Tuple, Dict
from pathlib import Path

from dandi import download
from dandi import dandiapi
from hdmf_zarr.nwb import NWBZarrIO
from pynwb import NWBHDF5IO
from tqdm.notebook import tqdm


def _is_zarr_asset(asset_path: Union[str, Path]) -> bool:
    """Return True when the provided asset path points to a Zarr-backed NWB."""
    path = str(asset_path).lower()
    return path.endswith(".zarr") or ".zarr/" in path


def open_nwb_io(path_or_url: Union[str, Path], mode: str = "r"):
    """Open an NWB IO object using the appropriate backend for HDF5 or Zarr."""
    if _is_zarr_asset(path_or_url):
        return NWBZarrIO(path=str(path_or_url), mode=mode)
    return NWBHDF5IO(str(path_or_url), mode=mode)


# downloads an NWB file from DANDI to download_loc, opens it, and returns the IO object for the NWB
# dandi_api_key is required to access files from embargoed dandisets
def dandi_download_open(dandiset_id, dandi_filepath, download_loc=None, dandi_api_key=None, force_overwrite=False, version=None):
    client = dandiapi.DandiAPIClient(token=dandi_api_key)
    dandiset = client.get_dandiset(dandiset_id, version_id=version)

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
    io = open_nwb_io(filepath, mode="r")
    return io


# streams an NWB file remotely from DANDI, opens it, and returns the IO object for the NWB
# dandi_api_key is required to access files from embargoed dandisets
def dandi_stream_open(dandiset_id, dandi_filepath, dandi_api_key=None, version=None):
    client = dandiapi.DandiAPIClient(token=dandi_api_key)
    dandiset = client.get_dandiset(dandiset_id, version_id=version)

    file = dandiset.get_asset_by_path(dandi_filepath)

    if _is_zarr_asset(dandi_filepath):
        zarr_url = file.client.session.head(file.base_download_url, allow_redirects=True).url
        io = open_nwb_io(zarr_url, mode="r")
        return io

    base_url = file.client.session.head(file.base_download_url)
    file_url = base_url.headers["Location"]

    rem_file = remfile.File(file_url)
    h5py_file = h5py.File(rem_file, "r")
    io = NWBHDF5IO(file=h5py_file, mode="r")
    return io


def get_download_file_iter_with_steps(
    file, chunk_size: int = None
) -> Tuple[Callable[[int], Iterator[bytes]], Dict[str, int]]:
    """
    Build a chunked byte-range downloader for a DANDI file object.
    
    This function creates an iterator-based downloader that uses HTTP range requests
    to fetch file content in chunks. It exists as an alternative to dandi_download_open
    for cases where you need fine-grained control over the download process or wish to
    display a detailed progress bar during download.
    
    Parameters
    ----------
    file : dandi.file.RemoteAsset
        The file object from a DANDI dandiset obtained via dandiset.get_asset_by_path()
    chunk_size : int, optional
        Size of each chunk in bytes. Defaults to DANDI_MAX_CHUNK_SIZE environment variable
        or 8MB if not set.
    
    Returns
    -------
    downloader : Callable
        A function that accepts a start_at position and yields byte chunks
    steps_dict : Dict
        Dictionary containing 'total_steps' key with the number of chunks needed
    
    See Also
    --------
    download_with_progressbar : Helper function to download with a tqdm progress bar
    """
    if chunk_size is None:
        chunk_size = int(os.environ.get("DANDI_MAX_CHUNK_SIZE", 1024 * 1024 * 8))
    
    url = file.base_download_url
    steps_dict = {"total_steps": None}
    result = file.client.session.get(url, stream=True)

    total_size = int(result.headers.get('content-length', 0))
    steps_dict["total_steps"] = total_size // chunk_size
    print(f"Downloading {total_size} bytes in {steps_dict['total_steps']} steps")

    def downloader(start_at: int = 0) -> Iterator[bytes]:
        headers = None
        if start_at > 0:
            headers = {"Range": f"bytes={start_at}-"}
        result = file.client.session.get(url, stream=True, headers=headers)
        result.raise_for_status()
        for chunk in result.iter_content(chunk_size=chunk_size):
            if chunk:  
                yield chunk

    return downloader, steps_dict


def download_with_progressbar(
    file, filepath: Union[str, Path], chunk_size: int = None
) -> None:
    """
    Download a file from DANDI with a progress bar.
    
    Uses get_download_file_iter_with_steps to download the file in chunks and
    displays a tqdm progress bar showing download progress.
    
    Parameters
    ----------
    file : dandi.file.RemoteAsset
        The file object from a DANDI dandiset obtained via dandiset.get_asset_by_path()
    filepath : str or Path
        Local file path where the downloaded content should be saved
    chunk_size : int, optional
        Size of each chunk in bytes. Defaults to DANDI_MAX_CHUNK_SIZE environment variable
        or 8MB if not set.
    
    See Also
    --------
    get_download_file_iter_with_steps : The underlying chunked downloader
    dandi_download_open : Standard download helper (simpler alternative)
    """
    if chunk_size is None:
        chunk_size = int(os.environ.get("DANDI_MAX_CHUNK_SIZE", 1024 * 1024 * 8))
    
    downloader, steps_dict = get_download_file_iter_with_steps(file, chunk_size=chunk_size)
    with open(filepath, "wb") as fp:
        for chunk in tqdm(downloader(0), total=steps_dict["total_steps"], unit="chunk", unit_scale=True, unit_divisor=1024):
            fp.write(chunk)
