from setuptools import setup, find_packages

with open("README.md", encoding="utf-8") as f:
    readme = f.read()

with open("LICENSE.txt") as f:
    license = f.read()

with open("requirements.txt", "r") as f:
    required = f.read().splitlines()

setup(
    name="databook_utils",
    description="Library of Jupyter notebooks for reproducible neuroscience analysis",
    long_description_content_type="text/markdown",
    long_description=readme,
    author="Carter Peene",
    version="1.0.0",
    author_email="carter.peene@alleninstitute.org",
    url="https://github.com/AllenInstitute/openscope_databook",
    license=license,
    package_dir={"databook_utils": "databook_utils"},
    install_requires=required
)
