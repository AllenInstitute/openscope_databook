# FAQ

## Data

**How do I make my own NWB files?**\
While NWB Files can be generated with [PyNWB](https://pynwb.readthedocs.io/en/stable/), it is typically an extensive process. [NeuroConv](https://neuroconv.readthedocs.io/en/main/) is a tool that makes this process easier. NWB Files can be very valuable, but it is recommended that you be prepared to invest a lot of time into producing them. Additionally, there are many datasets on [DANDI](https://dandiarchive.org/) that may suit your needs if you find yourself unequipped to make your own.

**How to upload my files to DANDI**\
The [DANDI Documentation](https://docs.dandiarchive.org) includes descriptions of the multiple ways files can be uploaded to DANDI.

**Where can I learn more about NWB files?**\
The Openscope Databook is a great place to demonstrate the capabilities and some workings of NWB Files for a number of use-cases. For a broader view of how they can be used or their inner workings, here are some resources.
- https://www.nwb.org/nwb-software/
- https://nwb-schema.readthedocs.io/en/stable/
- https://pynwb.readthedocs.io/en/stable/tutorials/general/file.html


### Computation

**Running with Binder/Thebe is not working, what's up?**\
As described in [This Jupyter blog post](https://blog.jupyter.org/mybinder-org-reducing-capacity-c93ccfc6413f), Binder no longer has the support of Google, and therefore shows reduced performance. Launches may fail or take a long time. There is no working solution to this except trying to launch again. An alternative would be to launch Databook notebooks with Google Colab.

**How can I store my work on the Databook and come back to it later?**\
You can fork the [GitHub repository](https://github.com/AllenInstitute/openscope_databook), and clone the repository to your local machine or [Dandihub](https://hub.dandiarchive.org). Running files locally and on Dandihub are explained in further detail on the [front page](https://alleninstitute.github.io/openscope_databook/intro.html). As you are working, be sure to commit your changes and push them to GitHub.

**How do you recommend using the Databook?**\
The Databook can be used to reproduce analysis on files, as a starting point for investigating a dataset, or as an educational resource to get more familiar with NWB files or particular kinds of data. In all of these cases, the code can be modified, copied, and interactively run to gain a better understanding of the data. For educational use, the databook may be run remotely with Thebe, Binder, or Google Colab as simple demonstrations. For more advanced usage and analysis, it may behoove you to download an individual notebook and run it locally.


### Environment

**How can I install the Databook?**\
Local Installation is described on the [front page](https://alleninstitute.github.io/openscope_databook/intro.html#locally).

**What do I do if packages are failing to install?**\
If local installation is failing, it is recommended that you attempt to clone and install the Databook in a [Conda environment](https://conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html). Here is a [Conda cheat-sheet](https://docs.conda.io/projects/conda/en/4.6.0/_downloads/52a95608c49671267e40c689e0bc00ca/conda-cheatsheet.pdf) if you only need a quick reference.


### Contribution

**How can I contribute to this project?**\
Contributing to this project can be as simple as forking the [GitHub repo](https://github.com/AllenInstitute/openscope_databook), making your changes, and issuing a PR on GitHub. However, it would be advised to reach out to [Jerome Lecoq](https://github.com/jeromelecoq) or [Carter Peene](https://github.com/rcpeene) and discuss if you wish to make a significant contribution.

### Citing

**How can I cite the Databook?**\
The Databook has a DOI through Zenodo, and can be cited accordingly 10.5281/zenodo.12614663.


### Additional Questions

**I have a question that isn't addressed here**\
Questions, bugs, or any other topics of interest can be discussed by filing an issue on the Github repo's [issues page](https://github.com/AllenInstitute/openscope_databook/issues).
