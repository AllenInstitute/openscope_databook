import subprocess, sys
from setuptools import setup

with open("README.md", encoding="utf-8") as f:
    readme = f.read()

with open("LICENSE.txt") as f:
    license = f.read()

with open("requirements.txt", "r") as f:
    required = f.read().splitlines()
    
# Function to install critical dependencies first (numpy, cython)
def pre_install_dependencies():
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "numpy", "cython"])
    except subprocess.CalledProcessError as e:
        print("Error occurred while installing numpy and cython:", e)
        sys.exit(1)  # Exit with error if installation fails

setup(
    name="databook_utils",
    description="Library of Jupyter notebooks for reproducible neuroscience analysis",
    long_description_content_type="text/markdown",
    long_description=readme,
    author="Carter Peene",
    version="1.3.0",
    author_email="carter.peene@alleninstitute.org",
    url="https://github.com/AllenInstitute/openscope_databook",
    license=license,
    package_dir={"databook_utils": "databook_utils"},
    install_requires=required,
    extras_require={
        "dev": [
            "markupsafe==2.0.1",
            "jupyter-book==1.0.0",
            "nbmake==1.5.3",
            "pytest-xdist==3.5.0"
        ]
    }
)
