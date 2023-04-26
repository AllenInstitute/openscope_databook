import os
import subprocess

blacklist = {"Publishing Bot", "github-actions[bot]", "Ross Carter Peene"}

# a function that inserts text into a markdown file
def insertAuthors(filename, placeholder, authors):
	with open(filename, "r") as md:
		lines = md.read().splitlines()
		
	for i in range(len(lines)):
		if placeholder in lines[i]:
			lines[i] = "### " + ", ".join(authors)

	with open("../docs/intro.md", "w") as md:
		md.write("\n".join(lines))

def getContributors():
	shortlog = subprocess.run(["git", "shortlog", "-sn"], capture_output=True, encoding="utf8").stdout
	contributions = shortlog.split("\n")[:-1]
	return {contribution.split("\t")[1] for contribution in contributions}

def main():
	contributors = getContributors()
	authors = contributors - blacklist
	insertAuthors("../docs/intro.md", "<!-- authors -->", authors)

main()

# <!-- authors -->
