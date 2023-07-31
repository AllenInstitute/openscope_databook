import os
import subprocess

blacklist = {"Publishing Bot", "github-actions[bot]", "GitHub Authors Action", "Ross Carter Peene", "rcpeene"}
additional_authors = ["Josh Siegle", "Ahad Bawany"]
aliases = {"colleenjg": "Colleen J. Gillon", "Carter Peene": "R. Carter Peene"}

# inserts a line of text into a markdown file between two placeholder lines
def insertIntoMarkdown(filename, placeholder_start, placeholder_end, text):
	with open(filename, "r") as md:
		lines = md.read().splitlines()
	
	# find placeholder line indices to insert between
	insert_start, insert_end = None, None
	for i in range(len(lines)):
		if placeholder_start in lines[i] and insert_start == None:
			insert_start = i
		if placeholder_end in lines[i] and insert_start != None:
			insert_end = i
			break

	# if placeholders were found, insert text
	if insert_start != None and insert_end != None:
		lines[insert_start+1:insert_end] = ["\n " + text + "\n"]

	with open(filename, "w") as md:
		md.write("\n".join(lines))


def getContributors():
	log = subprocess.Popen(["git", "log"], stdout=subprocess.PIPE, text=True)
	shortlog = subprocess.check_output(["git", "shortlog", "-sn"], stdin=log.stdout, encoding="utf8")
	print(shortlog)
	contributions = shortlog.split("\n")[:-1]
	contributors = {contribution.split("\t")[1] : contribution.split("\t")[0].strip() for contribution in contributions}
	return contributors


def getLatestRelease():
	return os.environ["LATEST_VERSION"]


def main():
	# getting processed authors list
	contributors = getContributors()
	aliased_contributors = { aliases.get(name, name): commits for name, commits in contributors.items() }
	authors = [contributor + " (" + str(n) + ")" for contributor, n in aliased_contributors.items() if contributor not in blacklist]
	authors += additional_authors
	print("Authors:", authors)

	# insert authors into intro file
	authors_text = "*" + ", ".join(authors) + "*"
	insertIntoMarkdown("./docs/intro.md", "<!-- authors start -->", "<!-- authors end -->", authors_text)

	# insert version number with link into intro file
	version_text = f"[{getLatestRelease}](https://github.com/AllenInstitute/openscope_databook/releases)"
	insertIntoMarkdown("./docs/intro.md", "<!-- version start -->", "<!-- version end -->", version_text)


main()
